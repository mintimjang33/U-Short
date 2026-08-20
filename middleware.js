import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// /.well-known/*는 여기 없어도 되지만(로그인 안 된 사용자도 접근 가능해야 함), matcher에서
// 아예 제외해서 정상적으로 404가 나가게 한다 — 여기 포함시키면 200(HTML)이 응답돼서
// claude.ai 같은 MCP 클라이언트가 "OAuth 서버가 있다"고 오해해 자동등록(DCR)을 시도하다 실패한다.
const PUBLIC_PATHS = ['/', '/login', '/auth/callback', '/policy', '/pricing', '/blog', '/notices'];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // public/ 폴더의 정적 파일(랜딩페이지 목업 이미지 등)은 확장자로 걸러서 미들웨어를 안 타게 한다.
  // 안 걸러지면 비로그인 방문자에게 이 파일들이 /login으로 리다이렉트되어 깨진 이미지로 보인다.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|\\.well-known/|.*\\.(?:jpg|jpeg|png|gif|svg|webp|avif|ico|css|js|woff|woff2)$).*)'],
};
