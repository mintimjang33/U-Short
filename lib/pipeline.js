import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractBlogContent } from './extract.js';
import { generateScript } from './generateScript.js';
import { synthesizeVoice } from './generateVoice.js';
import { buildCaptions } from './buildCaptions.js';
import { planScenes } from './planScenes.js';
import { generateVideoClip } from './generateVideoClips.js';
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
      targetChars: options.targetChars || undefined,
      customStyleDescription: options.customStyleDescription || undefined,
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
        speed: options.voiceSpeed || undefined,
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

    // AI 영상 생성 모드: 정적 이미지 대신, 내레이션을 장면 단위로 쪼개서 장면마다 AI로
    // 짧은 영상 클립을 생성하고, 자막 청크(캡션)마다 해당 시각의 클립을 scenes[]로 매핑한다.
    // InfoLayout/FullFocusedLayout 등 기존 레이아웃이 이미 scenes[sceneIndex].videoUrl을
    // 읽어서 배경으로 쓰는 상세편집용 메커니즘을 그대로 재사용한다 — 새 레이아웃 불필요.
    let scenes = project.scenes || [];
    if (options.videoMode === 'ai-generated') {
      await updateJob(supabase, jobId, { stage: 'ai-video' });
      const scenePlan = await planScenes({ narration: script.narration, durationMs });
      const clips = [];
      for (let i = 0; i < scenePlan.length; i++) {
        const scene = scenePlan[i];
        const { videoBuffer } = await generateVideoClip({
          prompt: scene.prompt,
          provider: options.videoProvider || 'wan',
          durationSec: Math.max(4, Math.round((scene.endMs - scene.startMs) / 1000)),
        });
        const clipUrl = await uploadToStorage(supabase, `jobs/${jobId}/clip-${i}.mp4`, videoBuffer, 'video/mp4');
        clips.push({ ...scene, videoUrl: clipUrl });
      }
      scenes = captions.map((cap) => {
        const clip = clips.find((c) => cap.startMs >= c.startMs && cap.startMs < c.endMs) || clips[clips.length - 1];
        return { videoUrl: clip.videoUrl };
      });
    }

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
        scenes,
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
      .update({ title_line1: script.titleLine1, title_line2: script.titleLine2, captions, audio_url: audioUrl, duration_ms: durationMs, scenes })
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
 * AI 인플루언서: 저장해둔 가상 페르소나(얼굴 사진+음성)로 주제에 맞는 대본을 만들고,
 * fal AI Avatar로 그 페르소나가 실제로 말하는 립싱크 영상을 생성한다. 자체 TTS/Remotion
 * 렌더링을 전혀 안 씀(fal 모델 자체가 텍스트→음성→립싱크영상까지 한 번에 처리) — 그래서
 * 워커가 처리하지만 무거운 Chromium 렌더링은 없고 순수 fal API 대기 시간이 대부분이다.
 */
export async function runAiInfluencerVideo({ videoRowId }) {
  await loadRemoteConfig();
  const supabase = getSupabaseServerClient();
  const { generateTalkingAvatar } = await import('./generateTalkingAvatar.js');

  const { data: videoRow, error: fetchError } = await supabase
    .from('ai_influencer_videos')
    .select('*, ai_influencers(*)')
    .eq('id', videoRowId)
    .single();
  if (fetchError || !videoRow) {
    console.error('[pipeline] ai_influencer_videos row를 찾을 수 없음', videoRowId, fetchError?.message);
    return;
  }
  const influencer = videoRow.ai_influencers;
  if (!influencer) {
    await supabase.from('ai_influencer_videos').update({ status: 'failed', error_message: '연결된 인플루언서 페르소나를 찾을 수 없습니다.' }).eq('id', videoRowId);
    return;
  }

  try {
    await supabase.from('ai_influencer_videos').update({ status: 'processing' }).eq('id', videoRowId);

    let narration = videoRow.narration;
    if (!narration) {
      const script = await generateScript({
        sourceText: videoRow.topic,
        planningMode: 'auto',
        style: 'hook',
        outputLanguage: 'ko',
        lengthMode: 'shortform',
        customStyleDescription: influencer.personality || undefined,
      });
      narration = script.narration;
      await supabase.from('ai_influencer_videos').update({ narration }).eq('id', videoRowId);
    }

    const { videoUrl } = await generateTalkingAvatar({
      imageUrl: influencer.reference_image_url,
      text: narration,
      voice: influencer.voice || 'Aria',
    });

    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`생성된 영상 다운로드 실패 (${videoRes.status})`);
    const buffer = Buffer.from(await videoRes.arrayBuffer());
    const publicUrl = await uploadToStorage(supabase, `ai-influencer/${videoRowId}.mp4`, buffer, 'video/mp4');

    await supabase.from('ai_influencer_videos').update({ status: 'completed', video_url: publicUrl }).eq('id', videoRowId);
  } catch (err) {
    console.error('[pipeline] ai_influencer_video 실패', videoRowId, err);
    await supabase.from('ai_influencer_videos').update({ status: 'failed', error_message: String(err?.message || err) }).eq('id', videoRowId);
  }
}

/**
 * 숏폼/롱폼 편집: AI가 대본/음성을 새로 만드는 다른 모든 파이프라인과 달리, 사용자가 직접
 * 찍은 영상(project.background.videoUrl)을 그대로 쓰고 그 영상의 실제 음성을 Whisper로
 * 받아써서 자막만 입힌다. TTS를 전혀 안 쓰므로 project.options.voiceProvider 등은 무시됨.
 * fal Whisper는 mp4를 audio_url 파라미터에 직접 넣어도 동작한다(공식 문서로 확인, 별도
 * 오디오 추출 단계 불필요).
 */
export async function runVideoEditPipeline({ projectId, jobId }) {
  await loadRemoteConfig();
  const supabase = getSupabaseServerClient();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    await updateJob(supabase, jobId, { status: 'failed', error_message: `프로젝트를 찾을 수 없습니다: ${projectError?.message || projectId}` });
    return;
  }
  const videoUrl = project.background?.videoUrl;
  if (!videoUrl) {
    await updateJob(supabase, jobId, { status: 'failed', error_message: '편집할 영상(background.videoUrl)이 없습니다. 먼저 영상을 업로드하세요.' });
    return;
  }

  let tempVideoPath = null;
  try {
    await updateJob(supabase, jobId, { status: 'processing', stage: 'transcribe' });
    const options = project.options || {};
    const outputLang = options.outputLanguage && options.outputLanguage !== 'original' ? options.outputLanguage : undefined;
    const words = await transcribeWordTimestamps(videoUrl, outputLang);
    if (!words || words.length === 0) {
      throw new Error('영상에서 음성을 인식하지 못했습니다(무음이거나 Whisper 처리 실패). 실제 목소리가 들리는 영상인지 확인하세요.');
    }
    const narration = words.map((w) => w.text).join(' ');
    const durationMs = words[words.length - 1].endMs + 3000; // 트레일링 여백

    await updateJob(supabase, jobId, { stage: 'captions' });
    const captions = buildCaptions({ narration, words, durationMs });

    await updateJob(supabase, jobId, { stage: 'render' });
    tempVideoPath = path.join(os.tmpdir(), `supershorts-${jobId}.mp4`);

    await renderShort({
      compositionId: 'VideoEditLayout',
      inputProps: {
        title: { line1: project.title_line1 || '', line2: project.title_line2 || '' },
        captions,
        captionPresetId: project.content_template_id,
        titlePresetId: options.titlePresetId || undefined,
        backgroundVideoUrl: videoUrl,
        backgroundColor: project.background?.color || '#0a0a0a',
        durationMs,
        extraInfo: project.extra_info || [],
        introEnabled: !!options.introEnabled,
        introTemplateId: options.introTemplateId || undefined,
        introDisplayOnly: options.introDisplayOnly ?? true,
      },
      outputLocation: tempVideoPath,
    });

    const videoBuffer = fs.readFileSync(tempVideoPath);
    const finalVideoUrl = await uploadToStorage(supabase, `jobs/${jobId}/final.mp4`, videoBuffer, 'video/mp4');

    await supabase.from('projects').update({ captions, duration_ms: durationMs, audio_url: null }).eq('id', projectId);

    await updateJob(supabase, jobId, { status: 'completed', stage: 'done', video_url: finalVideoUrl, credits_used: 0 });
  } catch (err) {
    console.error('[pipeline] video_edit job 실패', jobId, err);
    await updateJob(supabase, jobId, { status: 'failed', error_message: String(err?.message || err) });
  } finally {
    if (tempVideoPath) fs.rm(tempVideoPath, { force: true }, () => {});
  }
}

/**
 * ⑩ 파이프라인 단계별 분리 실행: 대본/장면은 그대로 두고 음성(voiceProvider/voice/voiceSpeed)만
 * 다시 만들고 싶을 때 쓰는 경량 재실행. extract/script 단계는 건너뛰고, 이미 저장된
 * captions[].text를 이어붙여 narration으로 재사용한다(원본 narration 단일 문자열은 DB에
 * 안 남기므로 이렇게 복원 — captions는 렌더링에 실제 쓰인 청크라 순서·내용이 원문과 동일함).
 * 음성이 바뀌면 길이/타이밍도 달라지므로 captions는 새로 만들고, render는 다시 돈다.
 */
export async function runVoiceUpdateRender({ projectId, jobId }) {
  await loadRemoteConfig();
  const supabase = getSupabaseServerClient();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    await updateJob(supabase, jobId, { status: 'failed', error_message: `프로젝트를 찾을 수 없습니다: ${projectError?.message || projectId}` });
    return;
  }
  if (!project.captions?.length) {
    await updateJob(supabase, jobId, { status: 'failed', error_message: '이 프로젝트는 대본(captions)이 없어서 음성만 재생성할 수 없습니다. 먼저 전체 제작을 완료하세요.' });
    return;
  }

  let tempVideoPath = null;
  try {
    await updateJob(supabase, jobId, { status: 'processing', stage: 'voice' });
    const options = project.options || {};
    const narration = project.captions.map((c) => c.text).join(' ');

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

    let audioUrl;
    let alignment = null;
    if (options.voiceProvider === 'recorded' && options.recordedAudioUrl) {
      audioUrl = options.recordedAudioUrl;
    } else {
      const synthesized = await synthesizeVoice({
        text: narration,
        voice: options.voice,
        provider: options.voiceProvider,
        credentials,
        speed: options.voiceSpeed || undefined,
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
      const outputLang = options.outputLanguage && options.outputLanguage !== 'original' ? options.outputLanguage : undefined;
      words = await transcribeWordTimestamps(audioUrl, outputLang);
      durationMs = words?.length ? words[words.length - 1].endMs + 300 : estimateNarrationDurationMs(narration);
    }

    await updateJob(supabase, jobId, { stage: 'captions' });
    const captions = buildCaptions({ narration, alignment, words, durationMs });

    await updateJob(supabase, jobId, { stage: 'render' });
    tempVideoPath = path.join(os.tmpdir(), `supershorts-${jobId}.mp4`);

    const backgroundImageUrl = project.background?.imageUrl || null;
    const backgroundVideoUrl = project.background?.videoUrl || null;
    const compositionId = (LAYOUTS.find((l) => l.id === project.layout_id) || LAYOUTS[0]).compositionId;

    await renderShort({
      compositionId,
      inputProps: {
        title: { line1: project.title_line1 || '', line2: project.title_line2 || '' },
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
    const videoUrl = await uploadToStorage(supabase, `jobs/${jobId}/final.mp4`, videoBuffer, 'video/mp4');

    await supabase.from('projects').update({ audio_url: audioUrl, duration_ms: durationMs, captions }).eq('id', projectId);

    await updateJob(supabase, jobId, { status: 'completed', stage: 'done', video_url: videoUrl, credits_used: 0 });
  } catch (err) {
    console.error('[pipeline] voice_update job 실패', jobId, err);
    await updateJob(supabase, jobId, { status: 'failed', error_message: String(err?.message || err) });
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
