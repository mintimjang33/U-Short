import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

/**
 * 서버 전용 Supabase 클라이언트 (service role key 사용, RLS 우회).
 * API Route Handler와 서버 컴포넌트에서만 사용한다 — 브라우저 번들에 노출되면 안 됨.
 */
export function getSupabaseServerClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다. .env.local을 확인하세요.'
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
