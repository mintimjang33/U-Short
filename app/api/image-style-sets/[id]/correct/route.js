import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../../../lib/apiHandler.js';
import { mergeStyleRule } from '../../../../../lib/mergeStyleRule.js';

// 생성된 이미지에서 뭐가 틀렸는지 한 문장으로 지적하면, 기존 learned_rules에 병합해서 저장한다.
// 다음부터 이 styleSetId로 생성하는 모든 이미지에 자동으로 반영된다(매번 재설명 불필요).
export const POST = withApiErrorHandling(async (request, { params }) => {
  const { id } = params;
  const body = await request.json().catch(() => null);
  if (!body || !body.correction) {
    return NextResponse.json({ error: 'correction은 필수입니다.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: set, error: fetchError } = await supabase.from('image_style_sets').select('*').eq('id', id).maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!set) return NextResponse.json({ error: `styleSetId를 찾을 수 없습니다: ${id}` }, { status: 404 });

  const mergedRules = await mergeStyleRule({ existingRules: set.learned_rules, correction: body.correction });

  const { data: updated, error: updateError } = await supabase
    .from('image_style_sets')
    .update({ learned_rules: mergedRules })
    .eq('id', id)
    .select()
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json(updated);
});
