import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/supabaseServerAuth.js';
import { getSupabaseServerClient } from '../../../../../lib/supabase.js';

const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OWNER_EMAIL',
  'MCP_SHARED_SECRET',
];

// 눈 버튼을 눌렀을 때만 호출되는 엔드포인트 — 목록 조회(GET /config-status)에서는
// 절대 전체 값을 내려주지 않고, 사용자가 명시적으로 "보기"를 요청한 값 하나만 돌려준다.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || user.email !== process.env.OWNER_EMAIL) {
    return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  }

  const { source, key } = await request.json().catch(() => ({}));
  if (!source || !key) {
    return NextResponse.json({ error: 'source/key가 필요합니다.' }, { status: 400 });
  }

  if (source === 'env') {
    if (!ENV_KEYS.includes(key)) {
      return NextResponse.json({ error: '알 수 없는 키입니다.' }, { status: 400 });
    }
    return NextResponse.json({ value: process.env[key] || null });
  }

  if (source === 'app_config') {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from('app_config').select('value').eq('key', key).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ value: data?.value || null });
  }

  return NextResponse.json({ error: '알 수 없는 source입니다.' }, { status: 400 });
}
