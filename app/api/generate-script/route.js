import { NextResponse } from 'next/server';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';
import { loadRemoteConfig } from '../../../lib/remoteConfig.js';
import { extractBlogContent } from '../../../lib/extract.js';
import { generateScript } from '../../../lib/generateScript.js';

// "대본 먼저 생성 → 확인/수정 → 스톡영상 선택 → 최종 제출" 2단계 흐름의 1단계.
// job을 만들지 않고 즉시 대본만 생성해서 돌려준다(렌더링까지 가는 /api/jobs와는 별개).
export const POST = withApiErrorHandling(async (request) => {
  await loadRemoteConfig();
  const body = await request.json();
  const { sourceUrl, sourceText, style, outputLanguage, lengthMode, scriptProvider, planningMode } = body;

  let text = sourceText || null;
  let images = [];
  if (sourceUrl) {
    const extracted = await extractBlogContent(sourceUrl);
    text = text || extracted.text;
    images = extracted.images;
  }
  if (!text) {
    return NextResponse.json({ error: '본문 텍스트를 확보하지 못했습니다 (sourceUrl / sourceText 둘 다 없음).' }, { status: 400 });
  }

  const script = await generateScript({
    sourceText: text,
    planningMode: planningMode || 'auto',
    style: style || 'summary',
    outputLanguage: outputLanguage || 'original',
    lengthMode: lengthMode || 'shortform',
    provider: scriptProvider,
  });

  return NextResponse.json({ ...script, images, sourceText: text });
});
