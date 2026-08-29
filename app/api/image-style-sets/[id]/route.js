import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../../lib/apiHandler.js';

export const DELETE = withApiErrorHandling(async (_request, { params }) => {
  const { id } = params;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('image_style_sets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
});
