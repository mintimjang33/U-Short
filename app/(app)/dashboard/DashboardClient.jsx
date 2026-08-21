'use client';

import { useMemo, useState } from 'react';

const STATUS_LABEL = {
  queued: '대기중',
  processing: '제작중',
  completed: '완료',
  failed: '실패',
};

export default function DashboardClient({ projects, folders: initialFolders }) {
  const [folders, setFolders] = useState(initialFolders);
  const [activeFolderId, setActiveFolderId] = useState('all'); // 'all' | folder.id
  const [search, setSearch] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const filtered = useMemo(() => {
    let list = projects;
    if (activeFolderId !== 'all') list = list.filter((p) => p.folder_id === activeFolderId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) => (p.title_line1 || '').toLowerCase().includes(q) || (p.source_url || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [projects, activeFolderId, search]);

  async function createFolder() {
    const name = window.prompt('새 폴더 이름을 입력하세요');
    if (!name || !name.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (res.ok) setFolders((prev) => [...prev, data.folder]);
    } finally {
      setCreatingFolder(false);
    }
  }

  async function moveToFolder(projectId, folderId) {
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: folderId || null }),
    });
    window.location.reload();
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="프로젝트 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <button type="button" className="pill" onClick={createFolder} disabled={creatingFolder}>
          + 새 폴더 만들기
        </button>
      </div>

      <div className="pill-group" style={{ marginBottom: 20 }}>
        <button type="button" className={`pill ${activeFolderId === 'all' ? 'selected' : ''}`} onClick={() => setActiveFolderId('all')}>
          전체
        </button>
        {folders.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`pill ${activeFolderId === f.id ? 'selected' : ''}`}
            onClick={() => setActiveFolderId(f.id)}
          >
            📁 {f.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ marginBottom: 16, color: '#9c9cb5' }}>
            {search || activeFolderId !== 'all' ? '조건에 맞는 프로젝트가 없어요.' : '아직 프로젝트가 없어요.'}
          </p>
          <a className="primary-btn" href="/new">
            + 첫 프로젝트 만들기
          </a>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="project-grid">
          {filtered.map((project) => {
            const status = project.latestJob?.status || 'queued';
            return (
              <div key={project.id} className="project-card" style={{ position: 'relative' }}>
                <a href={`/projects/${project.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                  <div className="project-thumb">
                    {project.latestJob?.video_url ? (
                      <video src={project.latestJob.video_url} muted />
                    ) : (
                      <span>{STATUS_LABEL[status]}</span>
                    )}
                  </div>
                  <div className="project-meta">
                    <div className="title">{project.title_line1 || project.source_url || '제목 없음'}</div>
                    <span className={`badge ${status}`}>{STATUS_LABEL[status] || status}</span>
                  </div>
                </a>
                {folders.length > 0 && (
                  <select
                    value={project.folder_id || ''}
                    onChange={(e) => moveToFolder(project.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, padding: '2px 4px' }}
                  >
                    <option value="">폴더 없음</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
