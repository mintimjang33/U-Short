import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/supabaseServerAuth.js';
import { getSupabaseServerClient } from '../../../../lib/supabase.js';
import { maskSecret } from '../../../../lib/maskSecret.js';

const PROVIDERS = ['elevenlabs', 'clova'];

// /account "API 키" 탭 — 사용자가 자기 TTS 키를 등록해두면 pipeline.js가 전역 키보다 우선해서 쓴다.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('user_api_keys').select('provider, credentials').eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const keys = (data || []).map((row) => ({
    provider: row.provider,
    masked: maskSecret(row.credentials?.apiKey || row.credentials?.clientId),
  }));
  return NextResponse.json({ keys });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || !PROVIDERS.includes(body.provider)) {
    return NextResponse.json({ error: `provider는 ${PROVIDERS.join('/')} 중 하나여야 합니다.` }, { status: 400 });
  }

  let credentials;
  if (body.provider === 'elevenlabs') {
    if (!body.apiKey) return NextResponse.json({ error: 'apiKey가 필요합니다.' }, { status: 400 });
    credentials = { apiKey: body.apiKey };
  } else {
    if (!body.clientId || !body.clientSecret) {
      return NextResponse.json({ error: 'clientId/clientSecret이 필요합니다.' }, { status: 400 });
    }
    credentials = { clientId: body.clientId, clientSecret: body.clientSecret };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('user_api_keys')
    .upsert({ user_id: user.id, provider: body.provider, credentials }, { onConflict: 'user_id,provider' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');
  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: `provider는 ${PROVIDERS.join('/')} 중 하나여야 합니다.` }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('user_api_keys').delete().eq('user_id', user.id).eq('provider', provider);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
