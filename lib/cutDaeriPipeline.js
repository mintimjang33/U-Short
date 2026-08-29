// U-OneShot(원샷배포) 프로젝트의 "컷대리" 기능을 위한 렌더링 파이프라인.
// 신규 파일 — 기존 pipeline.js(runPipeline/runSceneUpdateRender)는 건드리지 않는다.
//
// 컷대리는 U-OneShot 쪽(별도 Next.js 앱, 같은 Supabase 프로젝트를 공유)에서 이미 대본 생성 +
// 컷별 AI 이미지 생성 + 컷별 TTS 음성 생성까지 끝내놓는다(uos_cutdaeri_projects/uos_cutdaeri_cuts
// 테이블). 여기서는 그 결과물(이미지 URL + 음성 URL)을 그대로 받아서 최종 mp4로 합성만 한다 —
// 대본/음성/이미지를 다시 생성하지 않는다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseBuffer } from 'music-metadata';
import { renderShort } from './render.js';
import { getSupabaseServerClient } from './supabase.js';

const BUCKET = 'cutdaeri-assets'; // U-OneShot _migration_4_cutdaeri_storage.sql에서 만든 버킷
const FPS = 30;

async function getAudioDurationMs(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`음성 파일을 가져올 수 없습니다: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await parseBuffer(buf, 'audio/mpeg');
  return Math.round((meta.format.duration || 3) * 1000);
}

/**
 * uos_cutdaeri_projects.id를 받아서, 이미 생성된 컷별 이미지/음성을 CutDaeriLayout으로 렌더링하고
 * 결과 mp4를 cutdaeri-assets 버킷에 올린 뒤 projects.video_url/status를 갱신한다.
 */
export async function runCutDaeriRender({ projectId }) {
  const supabase = getSupabaseServerClient();

  const { data: project, error: projectError } = await supabase
    .from('uos_cutdaeri_projects')
    .select('*')
    .eq('id', projectId)
    .single();
  if (projectError || !project) {
    throw new Error(`컷대리 프로젝트를 찾을 수 없습니다: ${projectError?.message || projectId}`);
  }

  const { data: cuts, error: cutsError } = await supabase
    .from('uos_cutdaeri_cuts')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true });
  if (cutsError) throw new Error(cutsError.message);
  if (!cuts || cuts.length === 0) throw new Error('컷이 없습니다.');

  let cursorMs = 0;
  const captions = [];
  const scenes = [];
  for (const cut of cuts) {
    if (!cut.image_url || !cut.audio_url) {
      throw new Error(`컷 ${cut.order_index + 1}에 이미지 또는 음성이 없습니다. U-OneShot에서 먼저 전부 생성해주세요.`);
    }
    const durationMs = await getAudioDurationMs(cut.audio_url);
    captions.push({ text: cut.text, startMs: cursorMs, endMs: cursorMs + durationMs });
    scenes.push({ imageUrl: cut.image_url, audioUrl: cut.audio_url });
    cursorMs += durationMs;
  }

  const compositionId = project.aspect_ratio === '16:9' ? 'CutDaeriLayoutHorizontal' : 'CutDaeriLayout';
  const tempVideoPath = path.join(os.tmpdir(), `cutdaeri-${projectId}.mp4`);

  try {
    await renderShort({
      compositionId,
      inputProps: {
        captions,
        scenes,
        captionStyle: project.caption_style || null,
        durationMs: cursorMs,
        introEnabled: false,
      },
      outputLocation: tempVideoPath,
    });

    const videoBuffer = fs.readFileSync(tempVideoPath);
    const storagePath = `renders/${projectId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    await supabase.from('uos_cutdaeri_projects').update({ video_url: urlData.publicUrl, status: 'done' }).eq('id', projectId);
    return { videoUrl: urlData.publicUrl };
  } catch (err) {
    await supabase.from('uos_cutdaeri_projects').update({ status: 'failed' }).eq('id', projectId);
    throw err;
  } finally {
    fs.rm(tempVideoPath, { force: true }, () => {});
  }
}
