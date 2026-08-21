import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractBlogContent } from './extract.js';
import { generateScript } from './generateScript.js';
import { synthesizeVoice } from './generateVoice.js';
import { buildCaptions } from './buildCaptions.js';
import { renderShort } from './render.js';
import { getSupabaseServerClient } from './supabase.js';
import { transcribeWordTimestamps } from './transcribeTimestamps.js';
import { LAYOUTS, LENGTH_MODES, APPROX_CHARS_PER_SECOND } from './options.js';
import { loadRemoteConfig } from './remoteConfig.js';

const BUCKET = 'shorts';
// alignment도 Whisper도 둘 다 실패했을 때만 쓰는 최후의 근사치.
// 한국어 TTS 보통 속도 기준 평균치이며, 실제 음성 길이와는 오차가 있을 수 있다.

function estimateNarrationDurationMs(text) {
  const chars = text.replace(/\s+/g, '').length;
  return Math.max(2000, Math.round((chars / APPROX_CHARS_PER_SECOND) * 1000)) + 600; // 여유분 600ms
}

async function updateJob(supabase, jobId, patch) {
  const { error } = await supabase.from('jobs').update(patch).eq('id', jobId);
  if (error) console.error('[pipeline] job 업데이트 실패:', error.message);
}

async function uploadToStorage(supabase, storagePath, buffer, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Storage 업로드 실패(${storagePath}): ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * projectId/jobId가 이미 DB에 만들어져 있다는 전제 하에,
 * extract → script → voice → captions → render 순서로 파이프라인을 실행하고
 * 진행 단계마다 jobs 테이블을 업데이트한다. API 라우트에서 fire-and-forget으로 호출한다.
 */
export async function runPipeline({ projectId, jobId }) {
  await loadRemoteConfig();
  const supabase = getSupabaseServerClient();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    await updateJob(supabase, jobId, {
      status: 'failed',
      error_message: `프로젝트를 찾을 수 없습니다: ${projectError?.message || projectId}`,
    });
    return;
  }

  const options = project.options || {};
  let tempVideoPath = null;

  try {
    await updateJob(supabase, jobId, { status: 'processing', stage: 'extract' });

    let sourceText = project.source_text || null;
    let images = [];
    if (project.source_url) {
      const extracted = await extractBlogContent(project.source_url);
      sourceText = sourceText || extracted.text;
      images = extracted.images;
    }
    if (!sourceText) {
      throw new Error('본문 텍스트를 확보하지 못했습니다 (source_url / source_text 둘 다 없음).');
    }

    await updateJob(supabase, jobId, { stage: 'script' });
    // /new 페이지의 "대본 먼저 생성 → 확인/수정 → 스톡영상 선택 → 최종 제출" 흐름에서는
    // 이미 확정된 대본이 있으므로, 다시 AI를 호출해 (특히 제목이) 달라지지 않도록 그대로 재사용한다.
    const script = options.preGeneratedScript || (await generateScript({
      sourceText,
      planningMode: options.planningMode || 'auto',
      style: options.style || 'summary',
      outputLanguage: options.outputLanguage || 'original',
      lengthMode: options.lengthMode || 'shortform',
      provider: options.scriptProvider,
    }));

    await updateJob(supabase, jobId, { stage: 'voice' });
    // "내 목소리 녹음": TTS를 합성하지 않고, /new에서 사용자가 직접 녹음해서 미리 올려둔
    // 오디오를 그대로 쓴다. alignment가 없으니 아래에서 Whisper 폴백으로 타임스탬프를 뽑는다.
    let audioUrl;
    let alignment = null;
    if (options.voiceProvider === 'recorded' && options.recordedAudioUrl) {
      audioUrl = options.recordedAudioUrl;
    } else {
      // /account에 등록해둔 사용자 개인 TTS 키가 있으면 그걸 쓰고, 없으면 전역 키(app_config)로 폴백한다.
      let credentials;
      if (project.user_id && ['elevenlabs', 'clova'].includes(options.voiceProvider)) {
        const { data: keyRow } = await supabase
          .from('user_api_keys')
          .select('credentials')
          .eq('user_id', project.user_id)
          .eq('provider', options.voiceProvider)
          .maybeSingle();
        credentials = keyRow?.credentials || undefined;
      }
      const synthesized = await synthesizeVoice({
        text: script.narration,
        voice: options.voice,
        provider: options.voiceProvider,
        credentials,
      });
      alignment = synthesized.alignment;
      audioUrl = await uploadToStorage(supabase, `jobs/${jobId}/voice.mp3`, synthesized.audioBuffer, 'audio/mpeg');
    }

    let durationMs;
    let words = null;
    if (alignment?.character_end_times_seconds?.length) {
      const ends = alignment.character_end_times_seconds;
      durationMs = Math.ceil(ends[ends.length - 1] * 1000) + 300;
    } else {
      // alignment를 안 주는 provider(fal, Clova)는 이미 올려둔 음성 URL로 Whisper를 돌려서
      // 단어별 타임스탬프를 다시 뽑아본다. 실패하면 글자수 비례 근사치로 조용히 폴백한다.
      const outputLang = options.outputLanguage && options.outputLanguage !== 'original' ? options.outputLanguage : undefined;
      words = await transcribeWordTimestamps(audioUrl, outputLang);
      durationMs = words?.length
        ? words[words.length - 1].endMs + 300
        : estimateNarrationDurationMs(script.narration);
    }

    await updateJob(supabase, jobId, { stage: 'captions' });
    const captions = buildCaptions({ narration: script.narration, alignment, words, durationMs });

    await updateJob(supabase, jobId, { stage: 'render' });
    tempVideoPath = path.join(os.tmpdir(), `supershorts-${jobId}.mp4`);

    const backgroundImageUrl = project.background?.imageUrl || images[0] || null;
    const backgroundVideoUrl = project.background?.videoUrl || null;
    const compositionId = (LAYOUTS.find((l) => l.id === project.layout_id) || LAYOUTS[0]).compositionId;

    await renderShort({
      compositionId,
      inputProps: {
        title: { line1: script.titleLine1, line2: script.titleLine2 || '' },
        captions,
        captionPresetId: project.content_template_id,
        captionAnimationId: options.captionAnimationId || undefined,
        titlePresetId: options.titlePresetId || undefined,
        backgroundImageUrl,
        backgroundVideoUrl,
        backgroundColor: project.background?.color || '#0a0a0a',
        audioSrc: audioUrl,
        durationMs,
        extraInfo: project.extra_info || [],
        scenes: project.scenes || [],
        introEnabled: !!options.introEnabled,
        introTemplateId: options.introTemplateId || undefined,
        introDisplayOnly: options.introDisplayOnly ?? true,
      },
      outputLocation: tempVideoPath,
    });

    const videoBuffer = fs.readFileSync(tempVideoPath);
    const videoUrl = await uploadToStorage(
      supabase,
      `jobs/${jobId}/final.mp4`,
      videoBuffer,
      'video/mp4'
    );

    await supabase
      .from('projects')
      .update({ title_line1: script.titleLine1, title_line2: script.titleLine2, captions, audio_url: audioUrl, duration_ms: durationMs })
      .eq('id', projectId);

    await updateJob(supabase, jobId, {
      status: 'completed',
      stage: 'done',
      video_url: videoUrl,
      credits_used: (LENGTH_MODES.find((l) => l.id === options.lengthMode) || LENGTH_MODES[0]).credits,
    });
  } catch (err) {
    console.error('[pipeline] job 실패', jobId, err);
    await updateJob(supabase, jobId, {
      status: 'failed',
      error_message: String(err?.message || err),
    });
  } finally {
    if (tempVideoPath) fs.rm(tempVideoPath, { force: true }, () => {});
  }
}

/**
 * 상세편집(장면별 미디어/자막 프리셋)에서 scenes만 바꿨을 때 쓰는 경량 재렌더링.
 * extract/script/voice 단계를 전부 건너뛰고, 이미 완료된 프로젝트에 저장해둔
 * audio_url/captions/duration_ms를 그대로 재사용해서 render 단계만 다시 돈다.
 */
export async function runSceneUpdateRender({ projectId, jobId }) {
  await loadRemoteConfig();
  const supabase = getSupabaseServerClient();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    await updateJob(supabase, jobId, {
      status: 'failed',
      error_message: `프로젝트를 찾을 수 없습니다: ${projectError?.message || projectId}`,
    });
    return;
  }
  if (!project.audio_url || !project.captions?.length || !project.duration_ms) {
    await updateJob(supabase, jobId, {
      status: 'failed',
      error_message: '이 프로젝트는 아직 완료된 적이 없어서 장면만 재렌더링할 수 없습니다. 먼저 전체 제작을 완료하세요.',
    });
    return;
  }

  let tempVideoPath = null;
  try {
    await updateJob(supabase, jobId, { status: 'processing', stage: 'render' });
    tempVideoPath = path.join(os.tmpdir(), `supershorts-${jobId}.mp4`);

    const options = project.options || {};
    const backgroundImageUrl = project.background?.imageUrl || null;
    const backgroundVideoUrl = project.background?.videoUrl || null;
    const compositionId = (LAYOUTS.find((l) => l.id === project.layout_id) || LAYOUTS[0]).compositionId;

    await renderShort({
      compositionId,
      inputProps: {
        title: { line1: project.title_line1 || '', line2: project.title_line2 || '' },
        captions: project.captions,
        captionPresetId: project.content_template_id,
        captionAnimationId: options.captionAnimationId || undefined,
        titlePresetId: options.titlePresetId || undefined,
        backgroundImageUrl,
        backgroundVideoUrl,
        backgroundColor: project.background?.color || '#0a0a0a',
        audioSrc: project.audio_url,
        durationMs: project.duration_ms,
        extraInfo: project.extra_info || [],
        scenes: project.scenes || [],
        introEnabled: !!options.introEnabled,
        introTemplateId: options.introTemplateId || undefined,
        introDisplayOnly: options.introDisplayOnly ?? true,
      },
      outputLocation: tempVideoPath,
    });

    const videoBuffer = fs.readFileSync(tempVideoPath);
    const videoUrl = await uploadToStorage(supabase, `jobs/${jobId}/final.mp4`, videoBuffer, 'video/mp4');

    await updateJob(supabase, jobId, {
      status: 'completed',
      stage: 'done',
      video_url: videoUrl,
      credits_used: 0, // 음성/대본을 다시 만들지 않으므로 크레딧을 다시 쓰지 않는다.
    });
  } catch (err) {
    console.error('[pipeline] scene_update job 실패', jobId, err);
    await updateJob(supabase, jobId, {
      status: 'failed',
      error_message: String(err?.message || err),
    });
  } finally {
    if (tempVideoPath) fs.rm(tempVideoPath, { force: true }, () => {});
  }
}
