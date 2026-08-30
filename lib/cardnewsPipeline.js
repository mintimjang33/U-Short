import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { getSupabaseServerClient } from './supabase.js';
import { planCardnews } from './planCardnews.js';
import { generateImage } from './generateImage.js';
import { renderCardnewsPanel } from './render.js';
import { loadRemoteConfig } from './remoteConfig.js';

const BUCKET = 'shorts';

async function updateProject(supabase, id, patch) {
  const { error } = await supabase.from('cardnews_projects').update(patch).eq('id', id);
  if (error) console.error('[cardnewsPipeline] 프로젝트 업데이트 실패:', error.message);
}

async function uploadImage(supabase, path_, buffer) {
  const { error } = await supabase.storage.from(BUCKET).upload(path_, buffer, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`Storage 업로드 실패(${path_}): ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path_);
  return data.publicUrl;
}

/**
 * projectId가 이미 DB(cardnews_projects, status='queued')에 있다는 전제 하에,
 * 기획(planCardnews) → 카드별 이미지 생성(generateImage) → 텍스트 합성(renderCardnewsPanel)
 * 순서로 실행한다. 인스타툰 파이프라인과 거의 동일한 구조이되, 캐릭터 일관성 대신
 * style_set_id로 화풍/톤 일관성만 유지한다(카드뉴스는 캐릭터 스토리가 아니라 정보 카드라
 * 매 장마다 레퍼런스 이미지를 강제로 재사용하지 않고, 대신 art_style_id/learned_rules로
 * 톤을 맞춘다).
 */
export async function runCardnewsPipeline({ projectId }) {
  await loadRemoteConfig();
  const supabase = getSupabaseServerClient();

  const { data: project, error: fetchError } = await supabase
    .from('cardnews_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (fetchError || !project) {
    await updateProject(supabase, projectId, { status: 'failed', error_message: `프로젝트를 찾을 수 없습니다: ${fetchError?.message || projectId}` });
    return;
  }

  try {
    await updateProject(supabase, projectId, { status: 'processing', stage: 'planning' });
    const plannedCards = await planCardnews(project.topic, project.card_count);

    let referenceImageUrls = [];
    let styleSet = null;
    if (project.style_set_id) {
      const { data: set } = await supabase.from('image_style_sets').select('*').eq('id', project.style_set_id).maybeSingle();
      styleSet = set || null;
      referenceImageUrls = styleSet?.reference_image_urls || [];
    }

    await updateProject(supabase, projectId, { stage: 'generating', cards: plannedCards.map((c) => ({ ...c, imageUrl: null })) });

    const finishedCards = [];
    for (let i = 0; i < plannedCards.length; i++) {
      const card = plannedCards[i];

      // 1) 배경 이미지만 생성한다(텍스트는 아래 2)에서 Remotion으로 별도 합성 — 한글이
      //    이미지 프롬프트 안에서 깨지는 문제를 인스타툰과 동일한 방식으로 우회).
      let bgPrompt = card.imageDescription;
      if (styleSet?.learned_rules?.trim()) {
        bgPrompt = `${bgPrompt}\n\nStyle rules learned from past corrections:\n${styleSet.learned_rules.trim()}`;
      }
      const { imageUrl: falUrl } = await generateImage({ prompt: bgPrompt, referenceImageUrls, aspectRatio: '1:1' });
      const imgRes = await fetch(falUrl);
      if (!imgRes.ok) throw new Error(`카드 ${i + 1} 이미지 다운로드 실패 (${imgRes.status})`);
      const bgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const bgPublicUrl = await uploadImage(supabase, `cardnews/${projectId}/card-${i + 1}-bg.png`, bgBuffer);

      // 2) 실제 폰트로 제목+본문을 합성한 최종 PNG를 렌더링한다.
      const tempPngPath = path.join(os.tmpdir(), `cardnews-${projectId}-${i}-${crypto.randomUUID()}.png`);
      await renderCardnewsPanel({ backgroundImageUrl: bgPublicUrl, title: card.title, text: card.text, type: card.type, outputLocation: tempPngPath });
      const finalBuffer = fs.readFileSync(tempPngPath);
      fs.rm(tempPngPath, { force: true }, () => {});
      const publicUrl = await uploadImage(supabase, `cardnews/${projectId}/card-${i + 1}.png`, finalBuffer);

      finishedCards.push({ ...card, imageUrl: publicUrl });
      await updateProject(supabase, projectId, { cards: [...finishedCards, ...plannedCards.slice(i + 1).map((c) => ({ ...c, imageUrl: null }))] });
    }

    await updateProject(supabase, projectId, { status: 'completed', stage: 'done', cards: finishedCards });
  } catch (err) {
    console.error('[cardnewsPipeline] 실패', projectId, err);
    await updateProject(supabase, projectId, { status: 'failed', error_message: String(err?.message || err) });
  }
}
