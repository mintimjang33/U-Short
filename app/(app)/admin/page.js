'use client';

import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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
