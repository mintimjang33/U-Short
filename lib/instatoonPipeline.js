import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { getSupabaseServerClient } from './supabase.js';
import { planInstatoon } from './planInstatoon.js';
import { generateImage } from './generateImage.js';
import { renderInstatoonPanel } from './render.js';
import { loadRemoteConfig } from './remoteConfig.js';

const BUCKET = 'shorts';

async function updateProject(supabase, id, patch) {
  const { error } = await supabase.from('instatoon_projects').update(patch).eq('id', id);
  if (error) console.error('[instatoonPipeline] 프로젝트 업데이트 실패:', error.message);
}

async function uploadImage(supabase, path, buffer) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`Storage 업로드 실패(${path}): ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * projectId가 이미 DB(instatoon_projects, status='queued')에 있다는 전제 하에,
 * 기획(planInstatoon) → 컷별 이미지 생성(generateImage, 캐릭터 일관성 유지) 순서로 실행하고
 * 진행 단계마다 테이블을 업데이트한다. 워커(scripts/worker.js)가 폴링해서 호출한다.
 *
 * 캐릭터 일관성 전략: character_style_set_id가 지정돼 있으면 그 세트의 레퍼런스 이미지를
 * 전 컷에 동일하게 사용한다. 지정 안 됐으면 1컷은 레퍼런스 없이 생성하고, 그 결과 이미지를
 * 2컷부터의 레퍼런스로 자동 사용한다(Qventor의 "기준 이미지 1장 확정 후 반복" 워크플로와 동일 개념).
 */
export async function runInstatoonPipeline({ projectId }) {
  await loadRemoteConfig();
  const supabase = getSupabaseServerClient();

  const { data: project, error: fetchError } = await supabase
    .from('instatoon_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (fetchError || !project) {
    await updateProject(supabase, projectId, { status: 'failed', error_message: `프로젝트를 찾을 수 없습니다: ${fetchError?.message || projectId}` });
    return;
  }

  try {
    await updateProject(supabase, projectId, { status: 'processing', stage: 'planning' });
    const plannedPanels = await planInstatoon(project.topic, project.panel_count);

    let referenceImageUrls = [];
    if (project.character_style_set_id) {
      const { data: set } = await supabase.from('image_style_sets').select('reference_image_urls').eq('id', project.character_style_set_id).maybeSingle();
      referenceImageUrls = set?.reference_image_urls || [];
    }

    await updateProject(supabase, projectId, { stage: 'generating', panels: plannedPanels.map((p) => ({ ...p, imageUrl: null })) });

    const finishedPanels = [];
    for (let i = 0; i < plannedPanels.length; i++) {
      const panel = plannedPanels[i];

      // 1) 배경 이미지만 생성한다(텍스트를 프롬프트에 굽지 않음 — AI가 한글을 그림처럼 그리다
      //    깨뜨리는 문제가 있어서, 텍스트는 아래 2)에서 Remotion으로 별도 합성한다).
      const { imageUrl: falUrl } = await generateImage({ prompt: panel.imageDescription, referenceImageUrls, aspectRatio: '1:1' });
      const imgRes = await fetch(falUrl);
      if (!imgRes.ok) throw new Error(`컷 ${i + 1} 이미지 다운로드 실패 (${imgRes.status})`);
      const bgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const bgPublicUrl = await uploadImage(supabase, `instatoon/${projectId}/panel-${i + 1}-bg.png`, bgBuffer);

      // 2) 실제 폰트로 캡션 텍스트를 합성한 최종 PNG를 렌더링한다(renderStill, 헤드리스 Chromium).
      const tempPngPath = path.join(os.tmpdir(), `instatoon-${projectId}-${i}-${crypto.randomUUID()}.png`);
      await renderInstatoonPanel({ backgroundImageUrl: bgPublicUrl, text: panel.text, outputLocation: tempPngPath });
      const finalBuffer = fs.readFileSync(tempPngPath);
      fs.rm(tempPngPath, { force: true }, () => {});
      const publicUrl = await uploadImage(supabase, `instatoon/${projectId}/panel-${i + 1}.png`, finalBuffer);

      finishedPanels.push({ ...panel, imageUrl: publicUrl });
      await updateProject(supabase, projectId, { panels: [...finishedPanels, ...plannedPanels.slice(i + 1).map((p) => ({ ...p, imageUrl: null }))] });

      // 첫 컷을 만든 뒤, 별도 캐릭터 세트가 지정 안 됐으면 그 결과를 이후 컷들의 레퍼런스로 자동 사용.
      // 말풍선 텍스트가 합성되기 전의 순수 배경 이미지(bgPublicUrl)를 써야 다음 컷 생성 시
      // AI가 말풍선까지 캐릭터의 일부로 착각해 따라 그리는 걸 방지할 수 있다.
      if (i === 0 && referenceImageUrls.length === 0) {
        referenceImageUrls = [bgPublicUrl];
      }
    }

    await updateProject(supabase, projectId, { status: 'completed', stage: 'done', panels: finishedPanels });
  } catch (err) {
    console.error('[instatoonPipeline] 실패', projectId, err);
    await updateProject(supabase, projectId, { status: 'failed', error_message: String(err?.message || err) });
  }
}
