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
import { LENGTH_MODES, APPROX_CHARS_PER_SECOND } from './options.js';
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
    const script = await generateScript({
      sourceText,
      planningMode: options.planningMode || 'auto',
      style: options.style || 'summary',
      outputLanguage: options.outputLanguage || 'original',
      lengthMode: options.lengthMode || 'shortform',
      provider: options.scriptProvider,
    });

    await updateJob(supabase, jobId, { stage: 'voice' });
    const { audioBuffer, alignment } = await synthesizeVoice({
      text: script.narration,
      voice: options.voice,
      provider: options.voiceProvider,
    });

    const audioUrl = await uploadToStorage(
      supabase,
      `jobs/${jobId}/voice.mp3`,
      audioBuffer,
      'audio/mpeg'
    );

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

    await renderShort({
      compositionId: project.layout_id === 'card' ? 'CardLayout' : 'InfoLayout',
      inputProps: {
        title: { line1: script.titleLine1, line2: script.titleLine2 || '' },
        captions,
        captionPresetId: project.content_template_id,
        backgroundImageUrl,
        backgroundColor: project.background?.color || '#0a0a0a',
        audioSrc: audioUrl,
        durationMs,
        extraInfo: project.extra_info || [],
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
      .update({ title_line1: script.titleLine1, title_line2: script.titleLine2 })
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
