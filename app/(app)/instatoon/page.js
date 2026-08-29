'use client';

import { useEffect, useState } from 'react';

function Pill({ selected, onClick, children }) {
  return (
    <button type="button" className={`pill ${selected ? 'selected' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

const STATUS_LABEL = { queued: '대기중', processing: '생성중', completed: '완료', failed: '실패' };

export default function InstatoonPage() {
  const [projects, setProjects] = useState([]);
  const [styleSets, setStyleSets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [topic, setTopic] = useState('');
  const [panelCount, setPanelCount] = useState(6);
  const [characterStyleSetId, setCharacterStyleSetId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  async function loadProjects() {
    try {
      const res = await fetch('/api/instatoon');
      const data = await res.json();
      if (Array.isArray(data)) setProjects(data);
    } catch {
      // 무시
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
    fetch('/api/image-style-sets')
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setStyleSets(data))
      .catch(() => {});
  }, []);

  // 진행중인 프로젝트가 있으면 5초마다 자동 새로고침(워커 진행 상황 반영).
  useEffect(() => {
    const hasActive = projects.some((p) => p.status === 'queued' || p.status === 'processing');
    if (!hasActive) return;
    const timer = setInterval(loadProjects, 5000);
    return () => clearInterval(timer);
  }, [projects]);

  async function handleCreate() {
    if (!topic.trim()) {
      setError('주제를 입력해주세요.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/instatoon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), panelCount, characterStyleSetId: characterStyleSetId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '생성 요청 실패');
      setProjects((prev) => [data, ...prev]);
      setTopic('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    await fetch(`/api/instatoon/${id}`, { method: 'DELETE' });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <h1 className="page-title">인스타툰</h1>
      <p className="page-sub">
        주제만 입력하면 N컷 인스타툰을 자동으로 기획하고, 캐릭터 일관성을 유지하며 컷마다 이미지를 생성합니다.
        캐릭터 세트를 지정 안 하면 1컷 결과를 자동으로 이후 컷의 기준 캐릭터로 씁니다. PC의 워커(npm run worker)가 켜져 있어야 실제로 만들어집니다.
      </p>

      <div className="field">
        <h3>새 인스타툰 만들기</h3>
        <input
          type="text"
          placeholder="주제 (예: 월요일 출근길 직장인의 마음)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        <div className="field-hint" style={{ marginBottom: 4 }}>컷 수: {panelCount}</div>
        <input type="range" min={2} max={10} value={panelCount} onChange={(e) => setPanelCount(Number(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
        <div className="pill-group" style={{ marginBottom: 8 }}>
          <Pill selected={!characterStyleSetId} onClick={() => setCharacterStyleSetId('')}>캐릭터 자동(1컷 결과 재사용)</Pill>
          {styleSets.map((s) => (
            <Pill key={s.id} selected={characterStyleSetId === s.id} onClick={() => setCharacterStyleSetId(s.id)}>
              {s.name}
            </Pill>
          ))}
        </div>
        {error && <div style={{ color: '#f66', marginBottom: 8 }}>{error}</div>}
        <button className="primary-btn" onClick={handleCreate} disabled={creating}>
          {creating ? '요청 중...' : '인스타툰 만들기'}
        </button>
      </div>

      <div className="field">
        <h3>내 인스타툰</h3>
        {loading && <div>불러오는 중...</div>}
        {!loading && projects.length === 0 && <div className="field-hint">아직 만든 인스타툰이 없습니다.</div>}
        {projects.map((p) => (
          <div key={p.id} style={{ border: '1px solid #2a2a3c', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <b>{p.topic}</b>{' '}
                <span className="field-hint">
                  {STATUS_LABEL[p.status] || p.status}
                  {p.stage ? ` (${p.stage === 'planning' ? '기획중' : '생성중'})` : ''}
                  {p.status === 'processing' && ` · ${(p.panels || []).filter((x) => x.imageUrl).length}/${p.panel_count}컷 완료`}
                </span>
              </div>
              <button type="button" onClick={() => handleDelete(p.id)} style={{ fontSize: 11 }}>
                삭제
              </button>
            </div>
            {p.status === 'failed' && <div style={{ color: '#f66', fontSize: 12, marginBottom: 8 }}>{p.error_message}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(p.panels || []).map((panel, i) => (
                <div key={i} style={{ width: 110 }}>
                  {panel.imageUrl ? (
                    <img src={panel.imageUrl} alt="" style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <div style={{ width: 110, height: 110, borderRadius: 6, background: '#1a1a28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#6b6b85' }}>
                      {i + 1}컷 대기
                    </div>
                  )}
                  <div className="field-hint" style={{ fontSize: 10, marginTop: 2 }}>{panel.text}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
