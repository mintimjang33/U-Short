'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VideoEditPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setProjects(data.filter((p) => p.layout_id === 'video-edit')))
      .catch(() => {});
  }, []);

  async function handleSubmit() {
    if (!file) {
      setError('편집할 영상 파일을 선택해주세요.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || '영상 업로드 실패');

      setUploading(false);
      setSubmitting(true);
      const res = await fetch('/api/video-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: uploadData.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '제작 요청 실패');
      router.push(`/projects/${data.projectId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">숏폼/롱폼 편집</h1>
      <p className="page-sub">
        직접 찍은 영상을 업로드하면 AI가 대본이나 목소리를 새로 만들지 않고, 영상 속 실제 음성을 그대로 받아써서
        자막만 정확하게 입혀줍니다. PC의 워커(npm run worker)가 켜져 있어야 처리됩니다.
      </p>

      <div className="field">
        <label>편집할 영상 (mp4/webm/mov, 최대 100MB)</label>
        <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ marginTop: 8 }} />
        {error && <div style={{ color: '#f66', marginTop: 8 }}>{error}</div>}
        <button className="primary-btn" onClick={handleSubmit} disabled={uploading || submitting} style={{ marginTop: 12 }}>
          {uploading ? '업로드 중...' : submitting ? '제작 요청 중...' : '자막 입혀서 만들기'}
        </button>
      </div>

      {projects.length > 0 && (
        <div className="field">
          <h3>이전 영상 편집</h3>
          {projects.map((p) => (
            <div key={p.id} style={{ marginBottom: 6 }}>
              <a href={`/projects/${p.id}`}>{p.id.slice(0, 8)}... — {p.jobs?.[0]?.status || '알 수 없음'}</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
