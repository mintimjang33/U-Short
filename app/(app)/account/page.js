'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const PROVIDER_LABEL = { elevenlabs: 'ElevenLabs', clova: 'Naver CLOVA Voice' };

export default function AccountPage() {
  const router = useRouter();
  const [tab, setTab] = useState('profile');
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [keys, setKeys] = useState([]);
  const [elevenApiKey, setElevenApiKey] = useState('');
  const [clovaClientId, setClovaClientId] = useState('');
  const [clovaClientSecret, setClovaClientSecret] = useState('');
  const [savingKey, setSavingKey] = useState(null);

  function loadKeys() {
    fetch('/api/account/tts-keys')
      .then((r) => r.json())
      .then((d) => setKeys(d.keys || []))
      .catch(() => {});
  }

  useEffect(() => {
    if (tab === 'keys') loadKeys();
  }, [tab]);

  async function saveName(e) {
    e.preventDefault();
    setSavingName(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '수정 실패');
      setMsg('이름을 수정했어요.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingName(false);
    }
  }

  async function deleteAccount() {
    if (!confirm('정말 계정을 삭제할까요? 되돌릴 수 없습니다.')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/account/profile', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '삭제 실패');
      router.push('/');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  async function saveKey(provider) {
    setSavingKey(provider);
    setError(null);
    try {
      const body =
        provider === 'elevenlabs'
          ? { provider, apiKey: elevenApiKey }
          : { provider, clientId: clovaClientId, clientSecret: clovaClientSecret };
      const res = await fetch('/api/account/tts-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '등록 실패');
      setElevenApiKey('');
      setClovaClientId('');
      setClovaClientSecret('');
      loadKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey(null);
    }
  }

  async function removeKey(provider) {
    setSavingKey(provider);
    try {
      await fetch(`/api/account/tts-keys?provider=${provider}`, { method: 'DELETE' });
      loadKeys();
    } finally {
      setSavingKey(null);
    }
  }

  const elevenKey = keys.find((k) => k.provider === 'elevenlabs');
  const clovaKey = keys.find((k) => k.provider === 'clova');

  return (
    <div>
      <h1 className="page-title">내 정보</h1>
      <p className="page-sub">계정 설정을 관리하세요.</p>

      <div className="pill-group" style={{ marginBottom: 20 }}>
        <button type="button" className={`pill ${tab === 'profile' ? 'selected' : ''}`} onClick={() => setTab('profile')}>
          프로필
        </button>
        <button type="button" className={`pill ${tab === 'keys' ? 'selected' : ''}`} onClick={() => setTab('keys')}>
          API 키
        </button>
      </div>

      {error && <div style={{ color: '#fda4af', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {tab === 'profile' && (
        <div className="card" style={{ maxWidth: 480 }}>
          <form onSubmit={saveName}>
            <div className="field">
              <label>이름</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="표시할 이름" />
            </div>
            {msg && <div className="field-hint" style={{ marginBottom: 12 }}>{msg}</div>}
            <button type="submit" className="primary-btn" disabled={savingName}>
              {savingName ? '저장 중...' : '수정하기'}
            </button>
          </form>

          <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #2a2a3c' }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#fda4af' }}>계정 삭제</div>
            <div className="field-hint" style={{ marginBottom: 12 }}>계정을 삭제하면 모든 기록이 사라지고 복구할 수 없습니다.</div>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting}
              style={{ background: 'none', border: '1px solid rgba(244,63,94,0.35)', color: '#fda4af', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 13 }}
            >
              {deleting ? '삭제 중...' : '탈퇴하기'}
            </button>
          </div>
        </div>
      )}

      {tab === 'keys' && (
        <div className="card" style={{ maxWidth: 480 }}>
          <p className="field-hint" style={{ marginBottom: 20 }}>
            자신의 TTS API 키를 등록하면 새로 제작할 때 전역 기본 키 대신 이 키로 음성을 생성해요.
          </p>

          <div className="field">
            <label>ElevenLabs {elevenKey && <span style={{ color: '#9c9cb5', fontWeight: 400 }}>— 등록됨: {elevenKey.masked}</span>}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="password" placeholder="API 키" value={elevenApiKey} onChange={(e) => setElevenApiKey(e.target.value)} />
              <button type="button" className="primary-btn" onClick={() => saveKey('elevenlabs')} disabled={!elevenApiKey || savingKey === 'elevenlabs'}>
                등록
              </button>
              {elevenKey && (
                <button type="button" onClick={() => removeKey('elevenlabs')} disabled={savingKey === 'elevenlabs'}>
                  삭제
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <label>Naver CLOVA Voice {clovaKey && <span style={{ color: '#9c9cb5', fontWeight: 400 }}>— 등록됨: {clovaKey.masked}</span>}</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="text" placeholder="Client ID" value={clovaClientId} onChange={(e) => setClovaClientId(e.target.value)} />
              <input type="password" placeholder="Client Secret" value={clovaClientSecret} onChange={(e) => setClovaClientSecret(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="primary-btn" onClick={() => saveKey('clova')} disabled={!clovaClientId || !clovaClientSecret || savingKey === 'clova'}>
                등록
              </button>
              {clovaKey && (
                <button type="button" onClick={() => removeKey('clova')} disabled={savingKey === 'clova'}>
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
