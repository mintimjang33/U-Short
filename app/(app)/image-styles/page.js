'use client';

import { useEffect, useState } from 'react';
import { ART_STYLE_PRESETS } from '../../../lib/options.js';

function Pill({ selected, onClick, children }) {
  return (
    <button type="button" className={`pill ${selected ? 'selected' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

export default function ImageStylesPage() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [artStyleId, setArtStyleId] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const [testPrompt, setTestPrompt] = useState('');
  const [testStyleSetId, setTestStyleSetId] = useState('');
  const [testResultUrl, setTestResultUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [testError, setTestError] = useState(null);

  async function loadSets() {
    setLoading(true);
    try {
      const res = await fetch('/api/image-style-sets');
      const data = await res.json();
      if (Array.isArray(data)) setSets(data);
    } catch {
      // 무시 — 빈 목록으로 둔다.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSets();
  }, []);

  async function handleCreate() {
    if (!name.trim() || files.length === 0) {
      setError('이름과 이미지(최소 1장)를 입력해주세요.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploadedUrls = [];
      for (const file of files.slice(0, 2)) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '이미지 업로드 실패');
        uploadedUrls.push(data.url);
      }
      const res = await fetch('/api/image-style-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), artStyleId: artStyleId || null, referenceImageUrls: uploadedUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '저장 실패');
      setSets((prev) => [data, ...prev]);
      setName('');
      setArtStyleId('');
      setFiles([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    await fetch(`/api/image-style-sets/${id}`, { method: 'DELETE' });
    setSets((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleTestGenerate() {
    if (!testPrompt.trim()) {
      setTestError('프롬프트를 입력해주세요.');
      return;
    }
    setGenerating(true);
    setTestError(null);
    setTestResultUrl('');
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: testPrompt.trim(), styleSetId: testStyleSetId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '생성 실패');
      setTestResultUrl(data.url);
    } catch (err) {
      setTestError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">캐릭터/화풍 스타일</h1>
      <p className="page-sub">
        캐릭터 레퍼런스 이미지(최대 2장)를 등록해두면, 이후 이미지 생성 시 같은 캐릭터·구도로 일관되게 만들 수 있어요.
        인스타툰처럼 여러 장을 같은 캐릭터로 찍어낼 때 특히 유용합니다.
      </p>

      <div className="field">
        <h3>새 스타일 세트 만들기</h3>
        <input type="text" placeholder="세트 이름 (예: 내 캐릭터)" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
        <div className="pill-group" style={{ marginBottom: 8 }}>
          <Pill selected={!artStyleId} onClick={() => setArtStyleId('')}>화풍 지정 안 함</Pill>
          {ART_STYLE_PRESETS.map((a) => (
            <Pill key={a.id} selected={artStyleId === a.id} onClick={() => setArtStyleId(a.id)}>
              {a.label}
            </Pill>
          ))}
        </div>
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 2))} style={{ marginBottom: 8 }} />
        <div className="field-hint">레퍼런스 이미지 최대 2장 (JPEG/PNG/WebP)</div>
        {error && <div style={{ color: '#f66', marginBottom: 8 }}>{error}</div>}
        <button className="primary-btn" onClick={handleCreate} disabled={uploading}>
          {uploading ? '업로드 중...' : '스타일 세트 저장'}
        </button>
      </div>

      <div className="field">
        <h3>저장된 스타일 세트</h3>
        {loading && <div>불러오는 중...</div>}
        {!loading && sets.length === 0 && <div className="field-hint">아직 저장된 세트가 없습니다.</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {sets.map((s) => (
            <div key={s.id} style={{ border: '1px solid #2a2a3c', borderRadius: 8, padding: 10, width: 160 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {(s.reference_image_urls || []).map((url) => (
                  <img key={url} src={url} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 6 }} />
                ))}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
              <div className="field-hint">{ART_STYLE_PRESETS.find((a) => a.id === s.art_style_id)?.label || '화풍 미지정'}</div>
              <button type="button" onClick={() => handleDelete(s.id)} style={{ fontSize: 11, marginTop: 6 }}>
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <h3>테스트 생성</h3>
        <div className="pill-group" style={{ marginBottom: 8 }}>
          <Pill selected={!testStyleSetId} onClick={() => setTestStyleSetId('')}>스타일 세트 없이</Pill>
          {sets.map((s) => (
            <Pill key={s.id} selected={testStyleSetId === s.id} onClick={() => setTestStyleSetId(s.id)}>
              {s.name}
            </Pill>
          ))}
        </div>
        <input
          type="text"
          placeholder="이미지 프롬프트 (영어 권장, 예: character reading a book in a cafe)"
          value={testPrompt}
          onChange={(e) => setTestPrompt(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        {testError && <div style={{ color: '#f66', marginBottom: 8 }}>{testError}</div>}
        <button className="primary-btn" onClick={handleTestGenerate} disabled={generating}>
          {generating ? '생성 중...' : '이미지 생성'}
        </button>
        {testResultUrl && (
          <div style={{ marginTop: 12 }}>
            <img src={testResultUrl} alt="생성 결과" style={{ maxWidth: 280, borderRadius: 8 }} />
          </div>
        )}
      </div>
    </div>
  );
}
