'use client';

import { createBrowserClient } from '@supabase/ssr';

let client;

/**
 * 브라우저(클라이언트 컴포넌트) 전용 Supabase 클라이언트. publishable(anon) 키만 쓰고,
 * 세션은 쿠키에 저장돼서 middleware.js/서버 컴포넌트와 공유된다.
 */
export function getSupabaseBrowserClient() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  return client;
}
