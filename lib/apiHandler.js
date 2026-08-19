import { NextResponse } from 'next/server';

/**
 * Next.js API Route Handler를 감싸서, 안에서 던져진 에러(예: getSupabaseServerClient()가
 * 환경변수 없을 때 던지는 에러)가 Next의 기본 에러 페이지(HTML/빈 응답)로 새지 않고
 * 항상 { error: string } JSON으로 내려가게 한다.
 *
 * 실제로 .env.local 없이 브라우저에서 /api/templates를 호출해보니 이 처리가 없으면
 * 클라이언트에서 "Unexpected end of JSON input" 에러가 나는 걸 확인하고 추가함.
 */
export function withApiErrorHandling(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error('[api] 처리되지 않은 에러:', err);
      return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
    }
  };
}
