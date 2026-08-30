import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';
import { getCurrentUser } from '../../../lib/supabaseServerAuth.js';

export const GET = withApiErrorHandling(async () => {
  const user = await getCurrentUser();
  const supabase = getSupabaseServerClient();
  let query = supabase.from('ai_influencers').select('*').order('created_at', { ascending: false });
  if (user) query = query.eq('user_id', user.id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});

export const POST = withApiErrorHandling(async (request) => {
  const body = await request.json().catch(() => null);
  if (!body || !body.name || !body.referenceImageUrl) {
    return NextResponse.json({ error: 'name, referenceImageUrl은 필수입니다.' }, { status: 400 });
  }
  const user = await getCurrentUser();
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('ai_influencers')
    .insert({
      user_id: user?.id || null,
      name: body.name,
      reference_image_url: body.referenceImageUrl,
      voice: body.voice || 'Aria',
      personality: body.personality || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
});
