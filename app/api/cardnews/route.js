import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';
import { getCurrentUser } from '../../../lib/supabaseServerAuth.js';

export const GET = withApiErrorHandling(async () => {
  const user = await getCurrentUser();
  const supabase = getSupabaseServerClient();
  let query = supabase.from('cardnews_projects').select('*').order('created_at', { ascending: false });
  if (user) query = query.eq('user_id', user.id);
  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});

// job을 queued로 만들기만 한다 — 실제 기획+이미지생성은 PC 워커(scripts/worker.js)가 처리한다
// (인스타툰과 동일한 큐잉 패턴).
export const POST = withApiErrorHandling(async (request) => {
  const body = await request.json().catch(() => null);
  if (!body || !body.topic) {
    return NextResponse.json({ error: 'topic은 필수입니다.' }, { status: 400 });
  }

  const user = await getCurrentUser();
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('cardnews_projects')
    .insert({
      user_id: user?.id || null,
      topic: body.topic,
      card_count: body.cardCount || 6,
      style_set_id: body.styleSetId || null,
      status: 'queued',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
});
