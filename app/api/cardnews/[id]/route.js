import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../../lib/apiHandler.js';

export const GET = withApiErrorHandling(async (_request, { params }) => {
  const { id } = params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('cardnews_projects').select('*').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(data);
});

export const DELETE = withApiErrorHandling(async (_request, { params }) => {
  const { id } = params;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('cardnews_projects').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
});
