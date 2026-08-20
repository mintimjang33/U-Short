import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/supabaseServerAuth.js';
import { getSupabaseServerClient } from '../../../../lib/supabase.js';
import { maskSecret } from '../../../../lib/maskSecret.js';

// 로컬 .env.local(또는 Vercel 환경변수)에서 읽는 값들. 실제 값은 절대 여기서 내려주지 않고
// 마스킹된 미리보기만 준다 — 전체 값이 필요하면 /reveal 엔드포인트를 따로 호출해야 한다.
const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OWNER_EMAIL',
  'MCP_SHARED_SECRET',
];

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.email !== process.env.OWNER_EMAIL) {
    return null;
  }
  return user;
}

export async function GET() {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const envVars = ENV_KEYS.map((key) => ({
    source: 'env',
    key,
    masked: maskSecret(process.env[key]),
    present: !!process.env[key],
  }));

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('app_config').select('key, value').order('key');
  const appConfig = error
    ? []
    : (data || []).map((row) => ({ source: 'app_config', key: row.key, masked: maskSecret(row.value), present: true }));

  return NextResponse.json({ envVars, appConfig });
}
