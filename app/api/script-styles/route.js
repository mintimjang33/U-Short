import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';
import { getCurrentUser } from '../../../lib/supabaseServerAuth.js';
import { analyzeScriptStyle } from '../../../lib/analyzeScriptStyle.js';

// 저장된 커스텀 대본 스타일(레퍼런스 대본 학습) 목록 조회.
export const GET = withApiErrorHandling(async () => {
  const user = await getCurrentUser();
  const supabase = getSupabaseServerClient();
  let query = supabase.from('script_styles').select('*').order('created_at', { ascending: false });
  if (user) query = query.eq('user_id', user.id);
  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});

// 레퍼런스 대본을 분석해서 새 커스텀 스타일로 저장 (Qventor의 "대본 스타일 관리"와 같은 개념).
export const POST = withApiErrorHandling(async (request) => {
  const body = await request.json().catch(() => null);
  if (!body || !body.name || !body.referenceText) {
    return NextResponse.json({ error: 'name, referenceText는 필수입니다.' }, { status: 400 });
  }

  const styleDescription = await analyzeScriptStyle(body.referenceText);

  const user = await getCurrentUser();
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('script_styles')
    .insert({
      user_id: user?.id || null,
      name: body.name,
      reference_text: body.referenceText,
      style_description: styleDescription,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
});
