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
const TYPE_LABEL = { cover: '표지', body: '정보', summary: '요약' };

export default function CardnewsPage() {
  const [projects, setProjects] = useState([]);
  const [styleSets, setStyleSets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [topic, setTopic] = useState('');
  const [cardCount, setCardCount] = useState(6);
  const [styleSetId, setStyleSetId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  async function loadProjects() {
    try {
      const res = await fetch('/api/cardnews');
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
      const res = await fetch('/api/cardnews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), cardCount, styleSetId: styleSetId || null }),
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
    await fetch(`/api/cardnews/${id}`, { method: 'DELETE' });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <h1 className="page-title">카드뉴스</h1>
      <p className="page-sub">
        주제만 입력하면 N장의 카드뉴스를 자동으로 기획합니다(1장 표지 → 정보 카드 → 마지막 요약).
        화풍 스타일 세트를 지정하면 톤을 맞춰 생성합니다. PC의 워커(npm run worker)가 켜져 있어야 실제로 만들어집니다.
      </p>

      <div className="field">
        <h3>새 카드뉴스 만들기</h3>
        <input
          type="text"
          placeholder="주제 (예: 퇴근 후 30분 홈트 루틴)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        <div className="field-hint" style={{ marginBottom: 4 }}>카드 수: {cardCount}</div>
        <input type="range" min={3} max={10} value={cardCount} onChange={(e) => setCardCount(Number(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
        <div className="pill-group" style={{ marginBottom: 8 }}>
          <Pill selected={!styleSetId} onClick={() => setStyleSetId('')}>스타일 자동</Pill>
          {styleSets.map((s) => (
            <Pill key={s.id} selected={styleSetId === s.id} onClick={() => setStyleSetId(s.id)}>
              {s.name}
            </Pill>
          ))}
        </div>
        {error && <div style={{ color: '#f66', marginBottom: 8 }}>{error}</div>}
        <button className="primary-btn" onClick={handleCreate} disabled={creating}>
          {creating ? '요청 중...' : '카드뉴스 만들기'}
        </button>
      </div>

      <div className="field">
        <h3>내 카드뉴스</h3>
        {loading && <div>불러오는 중...</div>}
        {!loading && projects.length === 0 && <div className="field-hint">아직 만든 카드뉴스가 없습니다.</div>}
        {projects.map((p) => (
          <div key={p.id} style={{ border: '1px solid #2a2a3c', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <b>{p.topic}</b>{' '}
                <span className="field-hint">
                  {STATUS_LABEL[p.status] || p.status}
                  {p.stage ? ` (${p.stage === 'planning' ? '기획중' : '생성중'})` : ''}
                  {p.status === 'processing' && ` · ${(p.cards || []).filter((x) => x.imageUrl).length}/${p.card_count}장 완료`}
                </span>
              </div>
              <button type="button" onClick={() => handleDelete(p.id)} style={{ fontSize: 11 }}>
                삭제
              </button>
            </div>
            {p.status === 'failed' && <div style={{ color: '#f66', fontSize: 12, marginBottom: 8 }}>{p.error_message}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(p.cards || []).map((card, i) => (
                <div key={i} style={{ width: 110 }}>
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt="" style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <div style={{ width: 110, height: 110, borderRadius: 6, background: '#1a1a28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#6b6b85' }}>
                      {i + 1}장 대기
                    </div>
                  )}
                  <div className="field-hint" style={{ fontSize: 10, marginTop: 2 }}>
                    [{TYPE_LABEL[card.type] || card.type}] {card.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
