import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../../lib/apiHandler.js';

export const PATCH = withApiErrorHandling(async (request, { params }) => {
  const { id } = params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: '요청 본문이 비어있습니다.' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const patch = {};
  if (body.name) patch.name = body.name;
  if (body.layoutId) patch.layout_id = body.layoutId;
  if (body.config) patch.config = body.config;

  const { data, error } = await supabase
    .from('templates')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});

export const DELETE = withApiErrorHandling(async (_request, { params }) => {
  const { id } = params;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('templates').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
});
