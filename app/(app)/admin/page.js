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
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          가입 회원 <b style={{ color: '#111827' }}>{users?.length ?? 0}명</b>
        </div>
        <button onClick={load} className="primary-btn" style={{ padding: '6px 14px', fontSize: 13 }}>
          새로고침
        </button>
      </div>

      {loading && <div className="card">불러오는 중...</div>}
      {error && (
        <div className="card" style={{ color: '#dc2626' }}>
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
              color: '#9ca3af',
              borderBottom: '1px solid #f3f4f6',
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
                borderBottom: '1px solid #f9fafb',
              }}
            >
              <div>{u.displayName || u.email}</div>
              <div style={{ color: '#6b7280' }}>{u.provider}</div>
              <div style={{ color: '#6b7280' }}>{new Date(u.createdAt).toLocaleDateString('ko-KR')}</div>
              <div style={{ color: '#6b7280' }}>
                {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString('ko-KR') : '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
