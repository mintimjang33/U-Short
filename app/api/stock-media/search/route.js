import { NextResponse } from 'next/server';
import { withApiErrorHandling } from '../../../../lib/apiHandler.js';
import { loadRemoteConfig } from '../../../../lib/remoteConfig.js';
import { suggestKeywords, searchStockVideos } from '../../../../lib/stockMedia.js';

// 생성된 대본(제목+내레이션)에 맞는 스톡영상 후보를 찾아준다.
export const POST = withApiErrorHandling(async (request) => {
  await loadRemoteConfig();
  const { titleLine1, titleLine2, narration } = await request.json();

  if (!titleLine1 || !narration) {
    return NextResponse.json({ error: 'titleLine1과 narration이 필요합니다.' }, { status: 400 });
  }

  const keywords = await suggestKeywords({ titleLine1, titleLine2, narration });
  const videos = await searchStockVideos(keywords, 4);

  return NextResponse.json({ keywords, videos });
});
