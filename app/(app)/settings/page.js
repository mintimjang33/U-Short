'use client';

import { useEffect, useState } from 'react';
import {
  LAYOUTS,
  CAPTION_PRESET_LIST,
  INTRO_TEMPLATE_LIST,
  SCRIPT_PROVIDERS,
  VOICE_PROVIDERS,
  LENGTH_MODES,
  OUTPUT_LANGUAGES,
  SCRIPT_STYLES,
} from '../../../lib/options.js';

function Pill({ selected, onClick, children }) {
  return (
    <button type="button" className={`pill ${selected ? 'selected' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const [layoutId, setLayoutId] = useState('');
  const [captionPresetId, setCaptionPresetId] = useState('');
  const [introEnabled, setIntroEnabled] = useState(false);
  const [introTemplateId, setIntroTemplateId] = useState('');
  const [scriptProvider, setScriptProvider] = useState('');
  const [voiceProvider, setVoiceProvider] = useState('');
  const [lengthMode, setLengthMode] = useState('');
  const [outputLanguage, setOutputLanguage] = useState('');
  const [style, setStyle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/automation-defaults');
        const data = await res.json();
        setLayoutId(data.layout_id || '');
        setCaptionPresetId(data.caption_preset_id || '');
        setIntroEnabled(!!data.intro_enabled);
        setIntroTemplateId(data.intro_template_id || '');
        setScriptProvider(data.script_provider || '');
        setVoiceProvider(data.voice_provider || '');
        setLengthMode(data.length_mode || '');
        setOutputLanguage(data.output_language || '');
        setStyle(data.style || '');
      } catch {
        // 저장된 기본값이 없으면 전부 빈 값(=매번 직접 선택) 상태로 둔다.
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/automation-defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layoutId: layoutId || null,
          captionPresetId: captionPresetId || null,
          introEnabled,
          introTemplateId: introTemplateId || null,
          scriptProvider: scriptProvider || null,
          voiceProvider: voiceProvider || null,
          lengthMode: lengthMode || null,
          outputLanguage: outputLanguage || null,
          style: style || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '저장 실패');
      setMessage('저장했어요. 이제 "새로 제작"에서 값을 안 넣으면 이 기본값이 자동으로 쓰여요.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card">불러오는 중...</div>;

  return (
    <div>
      <h1 className="page-title">자동화 기본값</h1>
      <p className="page-sub">
        여기서 저장해두면 "새로 제작"이나 원격 MCP로 쇼츠를 요청할 때 값을 생략해도 이 설정이 자동 적용돼요.
        (실사이트의 "API 대시보드 자동화 기본값"과 같은 개념)
      </p>

      <div className="field">
        <label>기본 레이아웃</label>
        <div className="pill-group">
          <Pill selected={!layoutId} onClick={() => setLayoutId('')}>매번 직접 선택</Pill>
          {LAYOUTS.map((l) => (
            <Pill key={l.id} selected={layoutId === l.id} onClick={() => setLayoutId(l.id)}>
              {l.label}
            </Pill>
          ))}
        </div>
      </div>

      <div className="field">
        <label>기본 자막 프리셋</label>
        <div className="pill-group">
          <Pill selected={!captionPresetId} onClick={() => setCaptionPresetId('')}>매번 직접 선택</Pill>
          {CAPTION_PRESET_LIST.map((c) => (
            <Pill key={c.id} selected={captionPresetId === c.id} onClick={() => setCaptionPresetId(c.id)}>
              {c.label}
            </Pill>
          ))}
        </div>
      </div>

      <div className="field">
        <label>
          <input type="checkbox" checked={introEnabled} onChange={(e) => setIntroEnabled(e.target.checked)} style={{ marginRight: 6 }} />
          기본으로 인트로보드 사용
        </label>
        {introEnabled && (
          <div className="pill-group" style={{ marginTop: 10 }}>
            {INTRO_TEMPLATE_LIST.map((t) => (
              <Pill key={t.id} selected={introTemplateId === t.id} onClick={() => setIntroTemplateId(t.id)}>
                {t.label}
              </Pill>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <label>기본 대본 스타일</label>
        <div className="pill-group">
          <Pill selected={!style} onClick={() => setStyle('')}>매번 직접 선택</Pill>
          {SCRIPT_STYLES.map((s) => (
            <Pill key={s.id} selected={style === s.id} onClick={() => setStyle(s.id)}>
              {s.label}
            </Pill>
          ))}
        </div>
      </div>

      <div className="field">
        <label>기본 언어</label>
        <div className="pill-group">
          <Pill selected={!outputLanguage} onClick={() => setOutputLanguage('')}>매번 직접 선택</Pill>
          {OUTPUT_LANGUAGES.map((o) => (
            <Pill key={o.id} selected={outputLanguage === o.id} onClick={() => setOutputLanguage(o.id)}>
              {o.label}
            </Pill>
          ))}
        </div>
      </div>

      <div className="field">
        <label>기본 길이</label>
        <div className="pill-group">
          <Pill selected={!lengthMode} onClick={() => setLengthMode('')}>매번 직접 선택</Pill>
          {LENGTH_MODES.map((l) => (
            <Pill key={l.id} selected={lengthMode === l.id} onClick={() => setLengthMode(l.id)}>
              {l.label}
            </Pill>
          ))}
        </div>
      </div>

      <div className="field">
        <label>기본 대본 생성 AI</label>
        <div className="pill-group">
          <Pill selected={!scriptProvider} onClick={() => setScriptProvider('')}>매번 직접 선택</Pill>
          {SCRIPT_PROVIDERS.map((p) => (
            <Pill key={p.id} selected={scriptProvider === p.id} onClick={() => setScriptProvider(p.id)}>
              {p.label}
            </Pill>
          ))}
        </div>
      </div>

      <div className="field">
        <label>기본 음성</label>
        <div className="pill-group">
          <Pill selected={!voiceProvider} onClick={() => setVoiceProvider('')}>매번 직접 선택</Pill>
          {VOICE_PROVIDERS.map((v) => (
            <Pill key={v.id} selected={voiceProvider === v.id} onClick={() => setVoiceProvider(v.id)}>
              {v.label}
            </Pill>
          ))}
        </div>
      </div>

      {message && <div className="field-hint" style={{ marginBottom: 12 }}>{message}</div>}
      <button className="primary-btn" onClick={handleSave} disabled={saving}>
        {saving ? '저장 중...' : '기본값 저장'}
      </button>
    </div>
  );
}
