import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../../lib/apiHandler.js';
import { loadRemoteConfig } from '../../../../lib/remoteConfig.js';

function checkAuth(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return !!token && !!process.env.FLOW_EXTENSION_TOKEN && token === process.env.FLOW_EXTENSION_TOKEN;
}

// 크롬 확장 프로그램이 주기적으로 폴링해서 처리할 작업이 있는지 확인한다.
export const GET = withApiErrorHandling(async (request) => {
  await loadRemoteConfig();
  if (!checkAuth(request)) return NextResponse.json({ error: '인증 실패' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data: pending, error } = await supabase
    .from('flow_generation_tasks')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pending) return NextResponse.json({ task: null });

  const { data: claimed, error: claimError } = await supabase
    .from('flow_generation_tasks')
    .update({ status: 'claimed', claimed_at: new Date().toISOString() })
    .eq('id', pending.id)
    .eq('status', 'pending')
    .select()
    .maybeSingle();
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  // claimed가 null이면 다른 폴링 사이클(다중 탭 등)이 먼저 채간 것 — 다음 폴링에서 재시도.
  return NextResponse.json({ task: claimed || null });
});
