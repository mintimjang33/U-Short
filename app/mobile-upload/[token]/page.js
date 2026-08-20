'use client';

import { useState, use } from 'react';

export default function MobileUploadPage({ params }) {
  const { token } = use(params);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [error, setError] = useState(null);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`/api/mobile-upload/${token}`, { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '업로드 실패');
        setUploadedCount((c) => c + 1);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0a0a12',
        color: '#f4f4f8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        fontFamily: 'Pretendard, sans-serif',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>⚡ UShort</div>
      <p style={{ color: '#9c9cb5', marginBottom: 32, fontSize: 14 }}>
        여기서 올린 사진·영상이 PC 화면에 바로 나타나요.
      </p>

      <label
        style={{
          display: 'inline-block',
          padding: '16px 32px',
          borderRadius: 9999,
          backgroundImage: 'linear-gradient(135deg, #fb923c, #ec4899, #8b5cf6)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 15,
          cursor: 'pointer',
        }}
      >
        {uploading ? '업로드 중...' : '사진/영상 선택하기'}
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          capture="environment"
          onChange={handleFiles}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>

      {uploadedCount > 0 && (
        <p style={{ marginTop: 24, color: '#a78bfa', fontSize: 14 }}>
          {uploadedCount}개 업로드 완료! PC 화면을 확인하세요.
        </p>
      )}
      {error && <p style={{ marginTop: 16, color: '#fda4af', fontSize: 13 }}>{error}</p>}
    </div>
  );
}
