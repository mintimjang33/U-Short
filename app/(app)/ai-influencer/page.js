'use client';

import { useEffect, useState } from 'react';

const VOICES = ['Aria', 'Roger', 'Sarah', 'Laura', 'Charlie', 'George', 'Callum', 'River', 'Liam', 'Charlotte', 'Alice', 'Matilda', 'Will', 'Jessica', 'Eric', 'Chris', 'Brian', 'Daniel', 'Lily', 'Bill'];

function Pill({ selected, onClick, children }) {
  return (
    <button type="button" className={`pill ${selected ? 'selected' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

export default function AiInfluencerPage() {
  const [influencers, setInfluencers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [voice, setVoice] = useState('Aria');
  const [personality, setPersonality] = useState('');
  const [creating, setCreating] = useState(false);

  const [selectedInfluencerId, setSelectedInfluencerId] = useState('');
  const [topic, setTopic] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState(null);

  async function loadAll() {
    try {
      const [infRes, vidRes] = await Promise.all([fetch('/api/ai-influencers'), fetch('/api/ai-influencer-videos')]);
      const inf = await infRes.json();
      const vid = await vidRes.json();
      if (Array.isArray(inf)) setInfluencers(inf);
      if (Array.isArray(vid)) setVideos(vid);
    } catch {
      // 무시
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const hasActive = videos.some((v) => v.status === 'queued' || v.status === 'processing');
    if (!hasActive) return;
    const timer = setInterval(loadAll, 5000);
    return () => clearInterval(timer);
  }, [videos]);

  async function handleCreatePersona() {
    if (!name.trim() || !file) {
      setError('이름과 얼굴 사진을 입력해주세요.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || '사진 업로드 실패');

      const res = await fetch('/api/ai-influencers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), referenceImageUrl: uploadData.url, voice, personality: personality.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '저장 실패');
      setInfluencers((prev) => [data, ...prev]);
      setName('');
      setFile(null);
      setPersonality('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerate() {
    if (!selectedInfluencerId || !topic.trim()) {
      setError('페르소나를 고르고 주제를 입력해주세요.');
      return;
    }
    setRequesting(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-influencer-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencerId: selectedInfluencerId, topic: topic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '요청 실패');
      setVideos((prev) => [data, ...prev]);
      setTopic('');
    } catch (err) {
      setError(err.message);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">AI 인플루언서</h1>
      <p className="page-sub">
        얼굴 사진 하나로 가상 페르소나를 만들면, 주제만 줘도 그 페르소나가 실제로 말하는 립싱크 영상을 계속 만들 수 있어요.
        PC의 워커(npm run worker)가 켜져 있어야 처리됩니다.
      </p>

      <div className="field">
        <h3>새 페르소나 만들기</h3>
        <input type="text" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ marginBottom: 8 }} />
        <div className="field-hint" style={{ marginBottom: 4 }}>음성</div>
        <div className="pill-group" style={{ marginBottom: 8 }}>
          {VOICES.map((v) => (
            <Pill key={v} selected={voice === v} onClick={() => setVoice(v)}>
              {v}
            </Pill>
          ))}
        </div>
        <input
          type="text"
          placeholder="말투/성격 지침(선택, 예: 밝고 친근한 말투, 짧고 임팩트있게)"
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        {error && <div style={{ color: '#f66', marginBottom: 8 }}>{error}</div>}
        <button className="primary-btn" onClick={handleCreatePersona} disabled={creating}>
          {creating ? '저장 중...' : '페르소나 저장'}
        </button>
      </div>

      <div className="field">
        <h3>영상 만들기</h3>
        <div className="pill-group" style={{ marginBottom: 8 }}>
          {influencers.map((inf) => (
            <Pill key={inf.id} selected={selectedInfluencerId === inf.id} onClick={() => setSelectedInfluencerId(inf.id)}>
              {inf.name}
            </Pill>
          ))}
        </div>
        <input
          type="text"
          placeholder="무슨 내용을 말하게 할지 주제(예: 아침 루틴 꿀팁)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        <button className="primary-btn" onClick={handleGenerate} disabled={requesting}>
          {requesting ? '요청 중...' : '영상 생성 요청'}
        </button>
      </div>

      <div className="field">
        <h3>생성된 영상</h3>
        {loading && <div>불러오는 중...</div>}
        {!loading && videos.length === 0 && <div className="field-hint">아직 생성한 영상이 없습니다.</div>}
        {videos.map((v) => (
          <div key={v.id} style={{ border: '1px solid #2a2a3c', borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <div><b>{v.topic}</b> <span className="field-hint">{v.status}</span></div>
            {v.status === 'failed' && <div style={{ color: '#f66', fontSize: 12 }}>{v.error_message}</div>}
            {v.video_url && (
              <video src={v.video_url} controls style={{ width: 200, marginTop: 8, borderRadius: 6 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
