'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const STAGES = [
  { id: 'extract', label: '본문 추출' },
  { id: 'script', label: '대본 생성' },
  { id: 'voice', label: '음성 합성' },
  { id: 'captions', label: '자막 싱크' },
  { id: 'render', label: '영상 렌더링' },
  { id: 'done', label: '완료' },
];

export default function ProjectStatusPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function poll() {
      try {
        const res = await fetch(`/api/jobs?projectId=${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || '상태를 불러오지 못했습니다.');
          return;
        }
        setJob(data);
        setError(null);
        if (data.status !== 'completed' && data.status !== 'failed') {
          timer = setTimeout(poll, 2000);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  async function handleRetry() {
    if (!job) return;
    setRetrying(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/retry`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '재시도 요청에 실패했습니다.');
      // 새 job이 생겼으니 폴링이 다시 돌도록 페이지를 새로고침한다.
      router.refresh();
      window.location.reload();
    } catch (err) {
      setError(err.message);
      setRetrying(false);
    }
  }

  async function handleDeleteProject() {
    if (!confirm('이 프로젝트와 렌더링된 영상을 삭제할까요? 되돌릴 수 없습니다.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '삭제에 실패했습니다.');
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  const currentStageIndex = STAGES.findIndex((s) => s.id === job?.stage);

  return (
    <div>
      <h1 className="page-title">제작 현황</h1>
      <p className="page-sub">
        {job?.projects?.title_line1 || job?.projects?.source_url || '프로젝트 진행 상태를 확인하세요.'}
      </p>

      {error && <div className="card" style={{ color: '#b91c1c', marginBottom: 16 }}>{error}</div>}

      {!job && !error && <div className="card">불러오는 중...</div>}

      {job && job.status === 'failed' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ color: '#b91c1c', marginTop: 0 }}>제작에 실패했습니다: {job.error_message}</p>
          <button className="primary-btn" onClick={handleRetry} disabled={retrying}>
            {retrying ? '다시 시도하는 중...' : '같은 설정으로 다시 시도'}
          </button>
        </div>
      )}

      {job && (
        <div className="card">
          <div className="status-row">
            {STAGES.map((s, i) => (
              <span
                key={s.id}
                className={`step ${
                  job.status === 'completed' || i < currentStageIndex
                    ? 'done'
                    : i === currentStageIndex
                    ? 'current'
                    : ''
                }`}
              >
                {s.label}
              </span>
            ))}
          </div>

          {job.status === 'completed' && job.video_url ? (
            <div>
              <div className="preview-frame">
                <video src={job.video_url} controls style={{ width: '100%', height: '100%' }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <a className="primary-btn" href={job.video_url} download>
                  mp4 다운로드
                </a>
              </div>
            </div>
          ) : job.status !== 'failed' ? (
            <p style={{ color: '#6b7280', fontSize: 13 }}>
              제작 중입니다... (자동으로 2초마다 상태를 갱신해요)
            </p>
          ) : null}
        </div>
      )}

      {job && (
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            onClick={handleDeleteProject}
            disabled={deleting}
            style={{
              background: 'none',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: 10,
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {deleting ? '삭제 중...' : '프로젝트 삭제'}
          </button>
        </div>
      )}
    </div>
  );
}
