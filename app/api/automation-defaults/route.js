import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';
import { getCurrentUser } from '../../../lib/supabaseServerAuth.js';

export const GET = withApiErrorHandling(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('automation_defaults')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || {});
});

export const PUT = withApiErrorHandling(async (request) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const supabase = getSupabaseServerClient();

  const row = {
    user_id: user.id,
    layout_id: body.layoutId || null,
    caption_preset_id: body.captionPresetId || null,
    intro_enabled: !!body.introEnabled,
    intro_template_id: body.introTemplateId || null,
    script_provider: body.scriptProvider || null,
    voice_provider: body.voiceProvider || null,
    length_mode: body.lengthMode || null,
    output_language: body.outputLanguage || null,
    style: body.style || null,
  };

  const { data, error } = await supabase
    .from('automation_defaults')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});
