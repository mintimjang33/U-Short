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

  // 이미 'claimed'(진행 중 = 사용자의 실제 클릭을 기다리는 중)인 작업이 있으면 새로 안 준다.
  // 없으면 확장 프로그램이 6초마다 새 작업을 계속 밀어넣어서, 아직 사용자가 못 누른 이전
  // 프롬프트를 다음 작업이 덮어써버리는 문제가 실제로 발생했다(라이브 테스트로 확인함).
  const { data: inProgress, error: inProgressError } = await supabase
    .from('flow_generation_tasks')
    .select('id')
    .eq('status', 'claimed')
    .limit(1)
    .maybeSingle();
  if (inProgressError) return NextResponse.json({ error: inProgressError.message }, { status: 500 });
  if (inProgress) return NextResponse.json({ task: null });

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
