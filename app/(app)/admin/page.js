'use client';

import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pkgError, setPkgError] = useState(null);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(null);
  const [revealed, setRevealed] = useState({}); // `${source}:${key}` -> full value

  useEffect(() => {
    fetch('/api/admin/config-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setConfig(data);
      })
      .catch((e) => setConfigError(e.message));
  }, []);

  async function toggleReveal(source, key) {
    const id = `${source}:${key}`;
    if (revealed[id] !== undefined) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    try {
      const res = await fetch('/api/admin/config-status/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setRevealed((prev) => ({ ...prev, [id]: data.value }));
    } catch (e) {
      setConfigError(e.message);
    }
  }

  function copyValue(source, key, fallbackMasked) {
    const id = `${source}:${key}`;
    const value = revealed[id] ?? fallbackMasked;
    if (value) navigator.clipboard?.writeText(value).catch(() => {});
  }

  const [copyAllMsg, setCopyAllMsg] = useState(null);
  async function copyAllEnv() {
    setCopyAllMsg(null);
    try {
      const res = await fetch('/api/admin/config-status/reveal-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      await navigator.clipboard?.writeText(data.text);
      setCopyAllMsg('복사했어요! 새 PC의 .env.local에 그대로 붙여넣으세요.');
    } catch (e) {
      setCopyAllMsg(e.message);
    }
  }

  async function downloadWorkerPackage() {
    setPkgLoading(true);
    setPkgError(null);
    try {
      const res = await fetch('/api/admin/worker-package');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '다운로드 링크 발급 실패');
      window.location.href = json.url;
    } catch (e) {
      setPkgError(e.message);
    } finally {
      setPkgLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin-users');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '조회 실패');
      setUsers(json.users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="page-title">관리자</h1>
      <p className="page-sub">가입 회원 목록</p>

      <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: '#9c9cb5' }}>
          가입 회원 <b style={{ color: '#f4f4f8' }}>{users?.length ?? 0}명</b>
        </div>
        <button onClick={load} className="primary-btn" style={{ padding: '6px 14px', fontSize: 13 }}>
          새로고침
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#9c9cb5', marginBottom: 10 }}>
          다른 PC에서 렌더링 워커를 돌리고 싶을 때, 이 소스 패키지를 받아서 압축 풀고 <code>npm install</code> 후
          <code>워커_시작.bat</code>를 실행하세요. (관리자 계정으로 로그인했을 때만 다운로드 가능)
        </div>
        <button
          onClick={downloadWorkerPackage}
          className="primary-btn"
          style={{ padding: '6px 14px', fontSize: 13 }}
          disabled={pkgLoading}
        >
          {pkgLoading ? '링크 발급 중...' : '워커 패키지 다운로드'}
        </button>
        {pkgError && (
          <div style={{ color: '#fda4af', fontSize: 12, marginTop: 8 }}>{pkgError}</div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: '#9c9cb5' }}>
            설정값 확인 — 기본은 앞부분만 보이고, 👁 눌러서 전체 보기/복사 가능
          </div>
          <button
            onClick={copyAllEnv}
            className="primary-btn"
            style={{ padding: '6px 14px', fontSize: 13 }}
          >
            .env.local 전체 복사
          </button>
        </div>
        {copyAllMsg && <div style={{ fontSize: 12, color: '#9c9cb5', marginBottom: 10 }}>{copyAllMsg}</div>}

        {configError && <div style={{ color: '#fda4af', fontSize: 12 }}>{configError}</div>}

        {config && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9c9cb5', marginTop: 8, marginBottom: 6 }}>
              .env.local (Supabase 접속정보 등)
            </div>
            {config.envVars.map((row) => {
              const id = `env:${row.key}`;
              const isRevealed = revealed[id] !== undefined;
              return (
                <div
                  key={id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 0',
                    borderBottom: '1px solid #1c1c2b',
                    fontSize: 13,
                  }}
                >
                  <div style={{ width: 220, color: '#9c9cb5' }}>{row.key}</div>
                  <div style={{ flex: 1, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {row.present ? isRevealed ? revealed[id] : row.masked : <span style={{ color: '#6b6b85' }}>(없음)</span>}
                  </div>
                  {row.present && (
                    <>
                      <button onClick={() => toggleReveal('env', row.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>
                        {isRevealed ? '🙈' : '👁'}
                      </button>
                      <button onClick={() => copyValue('env', row.key, row.masked)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9c9cb5' }}>
                        복사
                      </button>
                    </>
                  )}
                </div>
              );
            })}

            <div style={{ fontSize: 12, fontWeight: 700, color: '#9c9cb5', marginTop: 16, marginBottom: 6 }}>
              app_config (AI/TTS/네이버 등 — 어느 PC든 자동으로 불러옴)
            </div>
            {config.appConfig.map((row) => {
              const id = `app_config:${row.key}`;
              const isRevealed = revealed[id] !== undefined;
              return (
                <div
                  key={id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 0',
                    borderBottom: '1px solid #1c1c2b',
                    fontSize: 13,
                  }}
                >
                  <div style={{ width: 220, color: '#9c9cb5' }}>{row.key}</div>
                  <div style={{ flex: 1, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {isRevealed ? revealed[id] : row.masked}
                  </div>
                  <button onClick={() => toggleReveal('app_config', row.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>
                    {isRevealed ? '🙈' : '👁'}
                  </button>
                  <button onClick={() => copyValue('app_config', row.key, row.masked)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9c9cb5' }}>
                    복사
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      {loading && <div className="card">불러오는 중...</div>}
      {error && (
        <div className="card" style={{ color: '#fda4af' }}>
          {error}
        </div>
      )}

      {users && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 140px 140px',
              gap: 8,
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: 700,
              color: '#9c9cb5',
              borderBottom: '1px solid #2a2a3c',
            }}
          >
            <div>이메일</div>
            <div>가입경로</div>
            <div>가입일</div>
            <div>최근 로그인</div>
          </div>
          {users.map((u) => (
            <div
              key={u.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 140px 140px',
                gap: 8,
                padding: '12px 16px',
                fontSize: 13,
                borderBottom: '1px solid #1c1c2b',
              }}
            >
              <div>{u.displayName || u.email}</div>
              <div style={{ color: '#9c9cb5' }}>{u.provider}</div>
              <div style={{ color: '#9c9cb5' }}>{new Date(u.createdAt).toLocaleDateString('ko-KR')}</div>
              <div style={{ color: '#9c9cb5' }}>
                {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString('ko-KR') : '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
