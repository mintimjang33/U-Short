'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CAPTION_PRESET_LIST } from '../../../../lib/options.js';

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

  const [editorOpen, setEditorOpen] = useState(false);
  const [scenes, setScenes] = useState([]);
  const [sceneUploading, setSceneUploading] = useState(null); // 업로드 중인 장면 인덱스
  const [savingScenes, setSavingScenes] = useState(false);

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

  useEffect(() => {
    if (job?.projects?.scenes) setScenes(job.projects.scenes);
  }, [job?.projects?.scenes]);

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

  function getScene(i) {
    return scenes[i] || {};
  }

  function updateScene(i, patch) {
    setScenes((prev) => {
      const next = [...prev];
      next[i] = { ...(next[i] || {}), ...patch };
      return next;
    });
  }

  async function handleSceneImageUpload(i, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSceneUploading(i);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '업로드 실패');
      if (file.type.startsWith('video/')) {
        updateScene(i, { videoUrl: data.url, imageUrl: undefined });
      } else {
        updateScene(i, { imageUrl: data.url, videoUrl: undefined });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSceneUploading(null);
    }
  }

  async function handleSaveScenes() {
    setSavingScenes(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '저장에 실패했습니다.');
      router.refresh();
      window.location.reload();
    } catch (err) {
      setError(err.message);
      setSavingScenes(false);
    }
  }

  const currentStageIndex = STAGES.findIndex((s) => s.id === job?.stage);
  const captions = job?.projects?.captions || [];

  return (
    <div>
      <h1 className="page-title">제작 현황</h1>
      <p className="page-sub">
        {job?.projects?.title_line1 || job?.projects?.source_url || '프로젝트 진행 상태를 확인하세요.'}
      </p>

      {error && <div className="card" style={{ color: '#fda4af', marginBottom: 16 }}>{error}</div>}

      {!job && !error && <div className="card">불러오는 중...</div>}

      {job && job.status === 'failed' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ color: '#fda4af', marginTop: 0 }}>제작에 실패했습니다: {job.error_message}</p>
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
              <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
                <a className="primary-btn" href={job.video_url} download>
                  mp4 다운로드
                </a>
                {captions.length > 0 && (
                  <button type="button" className="primary-btn" onClick={() => setEditorOpen((v) => !v)}>
                    {editorOpen ? '상세편집 닫기' : '상세편집'}
                  </button>
                )}
              </div>
            </div>
          ) : job.status !== 'failed' ? (
            <p style={{ color: '#9c9cb5', fontSize: 13 }}>
              제작 중입니다... (자동으로 2초마다 상태를 갱신해요)
            </p>
          ) : null}
        </div>
      )}

      {editorOpen && captions.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ fontSize: 13, color: '#9c9cb5', marginBottom: 16 }}>
            자막이 나오는 구간(장면)마다 다른 사진/영상이나 자막 스타일을 지정할 수 있어요. 비워두면 프로젝트 전체 기본값을 그대로 씁니다.
            음성은 다시 만들지 않아서 크레딧이 들지 않아요.
          </p>
          {captions.map((c, i) => {
            const scene = getScene(i);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: i < captions.length - 1 ? '1px solid #1c1c2b' : 'none',
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 96,
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#000',
                    flexShrink: 0,
                    border: '1px solid #2a2a3c',
                  }}
                >
                  {scene.videoUrl ? (
                    <video src={scene.videoUrl} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : scene.imageUrl ? (
                    <img src={scene.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.text}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 12, color: '#9c9cb5', cursor: 'pointer' }}>
                      {sceneUploading === i ? '업로드 중...' : '이미지/영상 바꾸기'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
                        onChange={(e) => handleSceneImageUpload(i, e)}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <select
                      value={scene.captionPresetId || ''}
                      onChange={(e) => updateScene(i, { captionPresetId: e.target.value || undefined })}
                      style={{ fontSize: 12, padding: '4px 8px' }}
                    >
                      <option value="">기본 자막 스타일</option>
                      {CAPTION_PRESET_LIST.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    {(scene.imageUrl || scene.videoUrl) && (
                      <button
                        type="button"
                        onClick={() => updateScene(i, { imageUrl: undefined, videoUrl: undefined })}
                        style={{ fontSize: 12, color: '#fda4af', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        초기화
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <button type="button" className="primary-btn" onClick={handleSaveScenes} disabled={savingScenes} style={{ marginTop: 16 }}>
            {savingScenes ? '저장하고 재렌더링 요청 중...' : '저장하고 다시 렌더링'}
          </button>
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
              border: '1px solid rgba(244,63,94,0.35)',
              color: '#fda4af',
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
