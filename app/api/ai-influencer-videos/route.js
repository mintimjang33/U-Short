import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';

export const GET = withApiErrorHandling(async () => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('ai_influencer_videos').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});

// job을 queued로 만들기만 한다 — 실제 대본생성+fal 영상생성은 PC 워커가 처리한다
// (create_shorts/app/api/jobs와 동일한 큐잉 패턴).
export const POST = withApiErrorHandling(async (request) => {
  const body = await request.json().catch(() => null);
  if (!body || !body.influencerId || !body.topic) {
    return NextResponse.json({ error: 'influencerId, topic은 필수입니다.' }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('ai_influencer_videos')
    .insert({ influencer_id: body.influencerId, topic: body.topic, status: 'queued' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
});
