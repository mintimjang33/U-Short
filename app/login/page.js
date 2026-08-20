'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabaseBrowser.js';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    const supabase = getSupabaseBrowserClient();

    const { error: authError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message);
    } else if (mode === 'signup') {
      setNotice('가입 완료. 이메일 인증이 필요하면 받은편지함을 확인해주세요. 인증 후 로그인해주세요.');
      setMode('signin');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
    setLoading(false);
  }

  async function onGoogle() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
          <h1
            style={{
              fontWeight: 800,
              fontSize: 18,
              backgroundImage: 'linear-gradient(135deg, #fdba74, #f472b6, #a78bfa)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            UShort
          </h1>
          <p style={{ fontSize: 12, color: '#9c9cb5', marginTop: 4 }}>
            {mode === 'signin' ? '로그인' : '계정 만들기'}
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            style={{
              height: 44,
              padding: '0 14px',
              borderRadius: 10,
              border: '1px solid #2a2a3c',
              background: '#1c1c2b',
              color: '#f4f4f8',
              fontSize: 14,
            }}
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)"
            style={{
              height: 44,
              padding: '0 14px',
              borderRadius: 10,
              border: '1px solid #2a2a3c',
              background: '#1c1c2b',
              color: '#f4f4f8',
              fontSize: 14,
            }}
          />

          {error && <p style={{ fontSize: 13, color: '#fda4af' }}>{error}</p>}
          {notice && <p style={{ fontSize: 13, color: '#6ee7b7' }}>{notice}</p>}

          <button type="submit" disabled={loading} className="primary-btn" style={{ height: 44, marginTop: 4 }}>
            {loading ? '처리 중...' : mode === 'signin' ? '로그인' : '가입하기'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
            setNotice(null);
          }}
          style={{ width: '100%', textAlign: 'center', fontSize: 12, color: '#9c9cb5', marginTop: 14, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {mode === 'signin' ? '계정이 없으신가요? 가입하기' : '이미 계정이 있으신가요? 로그인'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
          <div style={{ height: 1, background: '#2a2a3c', flex: 1 }} />
          <span style={{ fontSize: 11, color: '#6b6b85' }}>또는</span>
          <div style={{ height: 1, background: '#2a2a3c', flex: 1 }} />
        </div>

        <button
          onClick={onGoogle}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 10,
            border: '1px solid #2a2a3c',
            fontSize: 14,
            fontWeight: 600,
            background: '#1c1c2b',
            color: '#f4f4f8',
            cursor: 'pointer',
          }}
        >
          Google로 계속하기
        </button>
      </div>
    </div>
  );
}
