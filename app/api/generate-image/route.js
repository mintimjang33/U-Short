import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';
import { generateImage } from '../../../lib/generateImage.js';
import { ART_STYLE_PRESETS } from '../../../lib/options.js';
import { loadRemoteConfig } from '../../../lib/remoteConfig.js';

const BUCKET = 'shorts';

export const POST = withApiErrorHandling(async (request) => {
  await loadRemoteConfig();
  const body = await request.json().catch(() => null);
  if (!body || !body.prompt) {
    return NextResponse.json({ error: 'prompt는 필수입니다.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  let referenceImageUrls = body.referenceImageUrls || [];
  let fullPrompt = body.prompt;

  if (body.styleSetId) {
    const { data: set, error } = await supabase.from('image_style_sets').select('*').eq('id', body.styleSetId).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!set) return NextResponse.json({ error: `styleSetId를 찾을 수 없습니다: ${body.styleSetId}` }, { status: 404 });
    referenceImageUrls = set.reference_image_urls || [];
    if (set.art_style_id) {
      const preset = ART_STYLE_PRESETS.find((p) => p.id === set.art_style_id);
      if (preset) fullPrompt = `${fullPrompt}, ${preset.promptModifier}`;
    }
    if (set.learned_rules && set.learned_rules.trim()) {
      fullPrompt = `${fullPrompt}\n\nStyle rules learned from past corrections:\n${set.learned_rules.trim()}`;
    }
  } else if (body.artStyleId) {
    const preset = ART_STYLE_PRESETS.find((p) => p.id === body.artStyleId);
    if (preset) fullPrompt = `${fullPrompt}, ${preset.promptModifier}`;
  }

  const { imageUrl } = await generateImage({
    prompt: fullPrompt,
    referenceImageUrls,
    aspectRatio: body.aspectRatio || '9:16',
    provider: body.provider || 'nano-banana',
  });

  // google-flow는 generateImageViaFlow 안에서 이미 우리 Storage에 올려서 영구 URL을 반환한다 —
  // fal 임시 URL만 다시 내려받아 재업로드하면 된다.
  if (body.provider === 'google-flow') {
    return NextResponse.json({ url: imageUrl });
  }

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) return NextResponse.json({ error: `생성된 이미지 다운로드 실패 (${imgRes.status})` }, { status: 500 });
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const storagePath = `generated-images/${crypto.randomUUID()}.png`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType: 'image/png' });
  if (uploadError) return NextResponse.json({ error: `Storage 업로드 실패: ${uploadError.message}` }, { status: 500 });

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return NextResponse.json({ url: pub.publicUrl });
});
