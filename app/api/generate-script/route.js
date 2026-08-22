import { NextResponse } from 'next/server';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';
import { loadRemoteConfig } from '../../../lib/remoteConfig.js';
import { extractBlogContent } from '../../../lib/extract.js';
import { extractProductInfo } from '../../../lib/extractProduct.js';
import { generateScript } from '../../../lib/generateScript.js';
import { researchTopic } from '../../../lib/researchTopic.js';

// "대본 먼저 생성 → 확인/수정 → 스톡영상 선택 → 최종 제출" 2단계 흐름의 1단계.
// job을 만들지 않고 즉시 대본만 생성해서 돌려준다(렌더링까지 가는 /api/jobs와는 별개).
export const POST = withApiErrorHandling(async (request) => {
  await loadRemoteConfig();
  const body = await request.json();
  const { sourceUrl, sourceText, topic, style, outputLanguage, lengthMode, scriptProvider, planningMode } = body;

  let text = sourceText || null;
  let images = [];
  let sources = [];
  let product = null;
  if (sourceUrl && style === 'shopping') {
    // 쇼핑 구매유도형: 일반 블로그 파서 대신 상품 페이지 전용 추출(상품명/가격/JSON-LD Product)을 쓴다.
    product = await extractProductInfo(sourceUrl);
    text =
      text ||
      [`상품명: ${product.name}`, product.price ? `가격: ${product.price}` : null, `상품 URL: ${sourceUrl}`]
        .filter(Boolean)
        .join('\n');
    if (product.image) images = [product.image];
  } else if (sourceUrl) {
    const extracted = await extractBlogContent(sourceUrl);
    text = text || extracted.text;
    images = extracted.images;
  } else if (topic) {
    const researched = await researchTopic(topic);
    text = researched.text;
    sources = researched.sources;
  }
  if (!text) {
    return NextResponse.json({ error: '본문 텍스트를 확보하지 못했습니다 (sourceUrl / sourceText / topic 모두 없음).' }, { status: 400 });
  }

  const script = await generateScript({
    sourceText: text,
    planningMode: planningMode || 'auto',
    style: style || 'summary',
    outputLanguage: outputLanguage || 'original',
    lengthMode: lengthMode || 'shortform',
    provider: scriptProvider,
  });

  return NextResponse.json({ ...script, images, sources, sourceText: text, product });
});
