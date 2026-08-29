import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';
import { getCurrentUser } from '../../../lib/supabaseServerAuth.js';

// 저장된 캐릭터 일관성 레퍼런스 이미지 세트 목록 조회.
export const GET = withApiErrorHandling(async () => {
  const user = await getCurrentUser();
  const supabase = getSupabaseServerClient();
  let query = supabase.from('image_style_sets').select('*').order('created_at', { ascending: false });
  if (user) query = query.eq('user_id', user.id);
  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});

// 이름 + (선택)화풍 프리셋 + 레퍼런스 이미지 URL(최대 2장, 이미 /api/upload로 올려둔 것)로 새 세트 저장.
export const POST = withApiErrorHandling(async (request) => {
  const body = await request.json().catch(() => null);
  if (!body || !body.name || !Array.isArray(body.referenceImageUrls) || body.referenceImageUrls.length === 0) {
    return NextResponse.json({ error: 'name, referenceImageUrls(1장 이상)는 필수입니다.' }, { status: 400 });
  }
  if (body.referenceImageUrls.length > 2) {
    return NextResponse.json({ error: '레퍼런스 이미지는 최대 2장까지입니다.' }, { status: 400 });
  }

  const user = await getCurrentUser();
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('image_style_sets')
    .insert({
      user_id: user?.id || null,
      name: body.name,
      art_style_id: body.artStyleId || null,
      reference_image_urls: body.referenceImageUrls,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
});
