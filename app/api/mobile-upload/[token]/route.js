import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSupabaseServerClient } from '../../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../../lib/apiHandler.js';

// QR코드로 핸드폰에서 찍은 사진/영상을 PC로 바로 가져오는 기능.
// 로그인 없이도 폰에서 접근할 수 있어야 하므로, DB 대신 Storage 경로 자체를 세션으로 쓴다
// (mobile-uploads/{token}/... 밑에 있는 파일 = 그 QR 세션에 올라온 파일).
const BUCKET = 'shorts';
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
const MAX_BYTES = 100 * 1024 * 1024; // 100MB

function isValidToken(token) {
  return /^[a-zA-Z0-9-]{8,64}$/.test(token);
}

export const POST = withApiErrorHandling(async (request, { params }) => {
  const { token } = await params;
  if (!isValidToken(token)) {
    return NextResponse.json({ error: '잘못된 토큰입니다.' }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'file 필드가 필요합니다 (multipart/form-data).' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `지원하지 않는 파일 형식입니다: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `파일이 너무 큽니다 (최대 ${Math.round(MAX_BYTES / 1024 / 1024)}MB).` }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const ext = file.name.split('.').pop() || 'bin';
  const storagePath = `mobile-uploads/${token}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType: file.type, upsert: true });
  if (error) {
    return NextResponse.json({ error: `업로드 실패: ${error.message}` }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return NextResponse.json({ url: data.publicUrl, type: file.type });
});

export const GET = withApiErrorHandling(async (request, { params }) => {
  const { token } = await params;
  if (!isValidToken(token)) {
    return NextResponse.json({ error: '잘못된 토큰입니다.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.storage.from(BUCKET).list(`mobile-uploads/${token}`, {
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const files = (data || [])
    .filter((f) => f.name && !f.name.startsWith('.'))
    .map((f) => {
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(`mobile-uploads/${token}/${f.name}`);
      return { url: pub.publicUrl, type: f.metadata?.mimetype || null, name: f.name };
    });

  return NextResponse.json({ files });
});
