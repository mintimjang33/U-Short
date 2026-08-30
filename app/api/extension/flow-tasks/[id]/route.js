import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSupabaseServerClient } from '../../../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../../../lib/apiHandler.js';
import { loadRemoteConfig } from '../../../../../lib/remoteConfig.js';

const BUCKET = 'shorts';

function checkAuth(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return !!token && !!process.env.FLOW_EXTENSION_TOKEN && token === process.env.FLOW_EXTENSION_TOKEN;
}

// 크롬 확장 프로그램이 생성 완료(이미지 base64) 또는 실패(에러 메시지)를 보고한다.
export const PATCH = withApiErrorHandling(async (request, { params }) => {
  await loadRemoteConfig();
  if (!checkAuth(request)) return NextResponse.json({ error: '인증 실패' }, { status: 401 });

  const { id } = params;
  const body = await request.json().catch(() => null);
  if (!body || !body.status) return NextResponse.json({ error: 'status는 필수입니다.' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  if (body.status === 'failed') {
    const { error } = await supabase
      .from('flow_generation_tasks')
      .update({ status: 'failed', error_message: body.error || '알 수 없는 오류', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.status === 'completed') {
    if (!body.imageBase64) return NextResponse.json({ error: 'imageBase64는 필수입니다.' }, { status: 400 });
    const buffer = Buffer.from(body.imageBase64, 'base64');
    const storagePath = `flow-generated/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType: 'image/png' });
    if (uploadError) return NextResponse.json({ error: `Storage 업로드 실패: ${uploadError.message}` }, { status: 500 });

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const { error } = await supabase
      .from('flow_generation_tasks')
      .update({ status: 'completed', result_url: pub.publicUrl, completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, url: pub.publicUrl });
  }

  return NextResponse.json({ error: `알 수 없는 status: ${body.status}` }, { status: 400 });
});
