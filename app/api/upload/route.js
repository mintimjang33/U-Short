import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';

const BUCKET = 'shorts';
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/webm', // "내 목소리 녹음" 기능이 MediaRecorder로 만드는 파일 형식
  'audio/mpeg',
  'audio/mp4',
];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

export const POST = withApiErrorHandling(async (request) => {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'file 필드가 필요합니다 (multipart/form-data).' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `지원하지 않는 파일 형식입니다: ${file.type}` }, { status: 400 });
  }
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');
  const maxBytes = isVideo || isAudio ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `파일이 너무 큽니다 (최대 ${Math.round(maxBytes / 1024 / 1024)}MB).` },
      { status: 400 }
    );
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
