import { loadRemoteConfig } from './remoteConfig.js';

// 프레시시즌의 naver_news_search 도구와 동일한 방식(같은 자격증명 형식) — 코드는 새로 작성했지만
// 파라미터/엔드포인트/응답 정제 로직은 실제 소스(app/api/mcp/route.js)를 그대로 확인하고 맞춤.
export async function searchNaverNews({ query, display, sort }) {
  // AI/TTS 키와 같은 방식으로 Supabase app_config에서 자동으로 불러온다 —
  // 로컬 mcp-server든 Vercel의 원격 MCP든 재배포/설정 없이 바로 쓸 수 있게.
  await loadRemoteConfig();

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('NAVER_CLIENT_ID/NAVER_CLIENT_SECRET 환경변수가 설정되어 있지 않습니다.');
  }

  const params = new URLSearchParams({
    query,
    display: String(display || 10),
    sort: sort || 'sim',
  });

  const res = await fetch(`https://openapi.naver.com/v1/search/news.json?${params.toString()}`, {
    headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`네이버 뉴스 API 오류 (${res.status}): ${text}`);
  }

  const data = await res.json();
  const clean = (s) => s.replace(/<\/?b>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const items = (data.items || []).map((it) => ({
    title: clean(it.title),
    link: it.originallink || it.link,
    pubDate: it.pubDate,
    description: clean(it.description),
  }));

  return { query, total: data.total, items };
}
