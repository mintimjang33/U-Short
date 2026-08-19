import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';

export const GET = withApiErrorHandling(async () => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});

export const POST = withApiErrorHandling(async (request) => {
  const body = await request.json().catch(() => null);
  if (!body || !body.name || !body.layoutId) {
    return NextResponse.json({ error: 'name, layoutId는 필수입니다.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('templates')
    .insert({ name: body.name, layout_id: body.layoutId, config: body.config || {} })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
});
