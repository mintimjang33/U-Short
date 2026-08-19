import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';

const BUCKET = 'shorts';
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export const POST = withApiErrorHandling(async (request) => {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'file 필드가 필요합니다 (multipart/form-data).' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `지원하지 않는 파일 형식입니다: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '파일이 너무 큽니다 (최대 8MB).' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const ext = file.name?.split('.').pop() || 'png';
  const path = `uploads/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: `업로드 실패: ${error.message}` }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
});
