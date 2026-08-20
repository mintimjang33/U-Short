import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/supabaseServerAuth.js';
import { getSupabaseServerClient } from '../../../../lib/supabase.js';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.email !== process.env.OWNER_EMAIL) {
    return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from('releases')
    .createSignedUrl('ushort-worker-package.zip', 300); // 5분간 유효

  if (error) {
    return NextResponse.json({ error: `패키지를 찾을 수 없습니다: ${error.message}` }, { status: 404 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
