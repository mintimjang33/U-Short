'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SCRIPT_STYLES,
  OUTPUT_LANGUAGES,
  LENGTH_MODES,
  LAYOUTS,
  CAPTION_PRESET_LIST,
  SCRIPT_PROVIDERS,
  VOICE_PROVIDERS,
} from '../../lib/options.js';

function Pill({ selected, onClick, children }) {
  return (
    <button type="button" className={`pill ${selected ? 'selected' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const [sourceMode, setSourceMode] = useState('link'); // 'link' | 'manual'
  const [sourceUrl, setSourceUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [style, setStyle] = useState('summary');
  const [outputLanguage, setOutputLanguage] = useState('original');
  const [lengthMode, setLengthMode] = useState('shortform');
  const [layoutId, setLayoutId] = useState('info');
  const [captionPresetId, setCaptionPresetId] = useState(CAPTION_PRESET_LIST[0].id);
  const [scriptProvider, setScriptProvider] = useState('claude');
  const [voiceProvider, setVoiceProvider] = useState('fal');
  const [backgroundColor, setBackgroundColor] = useState('#0a0a0a');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [extraInfoText, setExtraInfoText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  useEffect(() => {
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => setSavedTemplates(Array.isArray(data) ? data : []))
      .catch(() => setSavedTemplates([]));
  }, []);

  function applyTemplate(id) {
    setSelectedTemplateId(id);
    if (!id) return;
    const t = savedTemplates.find((x) => x.id === id);
    if (!t) return;
    setLayoutId(t.layout_id);
    const config = t.config || {};
    if (config.captionPresetId) setCaptionPresetId(config.captionPresetId);
    if (config.background?.color) setBackgroundColor(config.background.color);
    setBackgroundImageUrl(config.background?.imageUrl || '');
    setExtraInfoText(config.extraInfo?.[0]?.text || '');
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '업로드 실패');
      setBackgroundImageUrl(data.url);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (sourceMode === 'link' && !sourceUrl.trim()) {
      setError('블로그 URL을 입력해주세요.');
      return;
    }
    if (sourceMode === 'manual' && manualText.trim().length < 10) {
      setError('대본을 10자 이상 입력해주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: sourceMode === 'link' ? sourceUrl.trim() : null,
          sourceText: sourceMode === 'manual' ? manualText.trim() : null,
          style,
          outputLanguage,
          lengthMode,
          layoutId,
          captionPresetId,
          scriptProvider,
          voiceProvider,
          background: { color: backgroundColor, imageUrl: backgroundImageUrl || null },
          extraInfo: extraInfoText ? [{ text: extraInfoText, x: 24, y: 24 }] : [],
          // 직접 작성한 대본은 AI가 다시 기획하지 않고 그대로 쓰도록 direct 모드로 보낸다.
          planningMode: sourceMode === 'manual' ? 'direct' : 'auto',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '요청에 실패했습니다.');
      router.push(`/projects/${data.projectId}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">새 쇼츠 만들기</h1>
      <p className="page-sub">
        {sourceMode === 'link'
          ? '네이버블로그, 티스토리 등 이미 게시된 링크로 쇼츠를 자동 제작해요.'
          : '이미 다듬어둔 대본이 있다면 그대로 붙여넣으세요. AI가 내용을 다시 쓰지 않고 제목만 만들어요.'}
      </p>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 640 }}>
        <div className="field">
          <label>소스</label>
          <div className="pill-group">
            <Pill selected={sourceMode === 'link'} onClick={() => setSourceMode('link')}>
              🔗 블로그 링크
            </Pill>
            <Pill selected={sourceMode === 'manual'} onClick={() => setSourceMode('manual')}>
              📝 직접 대본 작성
            </Pill>
          </div>
        </div>

        {sourceMode === 'link' ? (
          <div className="field">
            <label>블로그 URL</label>
            <input
              type="url"
              placeholder="https://blog.naver.com/..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              required={sourceMode === 'link'}
            />
          </div>
        ) : (
          <div className="field">
            <label>내 대본</label>
            <textarea
              rows={6}
              placeholder="TTS가 그대로 읽을 내레이션 텍스트를 입력하세요."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              required={sourceMode === 'manual'}
            />
            <div className="field-hint">{manualText.trim().length}자 입력됨</div>
          </div>
        )}

        <div className="field">
          <label>대본 스타일</label>
          <div className="pill-group">
            {SCRIPT_STYLES.map((s) => (
              <Pill key={s.id} selected={style === s.id} onClick={() => setStyle(s.id)}>
                {s.label}
              </Pill>
            ))}
          </div>
        </div>

        <div className="field">
          <label>출력 언어</label>
          <div className="pill-group">
            {OUTPUT_LANGUAGES.map((l) => (
              <Pill key={l.id} selected={outputLanguage === l.id} onClick={() => setOutputLanguage(l.id)}>
                {l.label}
              </Pill>
            ))}
          </div>
        </div>

        <div className="field">
          <label>영상 길이</label>
          <div className="pill-group">
            {LENGTH_MODES.map((l) => (
              <Pill key={l.id} selected={lengthMode === l.id} onClick={() => setLengthMode(l.id)}>
                {l.label}
              </Pill>
            ))}
          </div>
        </div>

        {savedTemplates.length > 0 && (
          <div className="field">
            <label>저장된 템플릿에서 불러오기 (선택)</label>
            <select value={selectedTemplateId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">-- 직접 설정 --</option>
              {savedTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="field-hint">템플릿 에디터(/templates)에서 저장해둔 스타일을 그대로 불러와요.</div>
          </div>
        )}

        <div className="field">
          <label>레이아웃</label>
          <div className="pill-group">
            {LAYOUTS.map((l) => (
              <Pill key={l.id} selected={layoutId === l.id} onClick={() => setLayoutId(l.id)}>
                {l.label}
              </Pill>
            ))}
          </div>
        </div>

        <div className="field">
          <label>배경색</label>
          <input type="text" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
        </div>

        <div className="field">
          <label>배경 이미지 (선택, 안 넣으면 블로그 대표 이미지를 자동으로 씀)</label>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileUpload} />
          {uploading && <div className="field-hint">업로드 중...</div>}
          {uploadError && <div className="field-hint" style={{ color: '#b91c1c' }}>{uploadError}</div>}
          {backgroundImageUrl && (
            <div className="field-hint">
              업로드됨: <a href={backgroundImageUrl} target="_blank" rel="noreferrer">미리보기</a>{' '}
              <button type="button" onClick={() => setBackgroundImageUrl('')} style={{ marginLeft: 8 }}>
                제거
              </button>
            </div>
          )}
        </div>

        <div className="field">
          <label>부가정보 오버레이 텍스트 (선택)</label>
          <input
            type="text"
            placeholder="예: @내채널"
            value={extraInfoText}
            onChange={(e) => setExtraInfoText(e.target.value)}
          />
        </div>

        <div className="field">
          <label>자막 프리셋</label>
          <select value={captionPresetId} onChange={(e) => setCaptionPresetId(e.target.value)}>
            {CAPTION_PRESET_LIST.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>대본 생성 AI</label>
          <select value={scriptProvider} onChange={(e) => setScriptProvider(e.target.value)}>
            {SCRIPT_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>음성(TTS)</label>
          <select value={voiceProvider} onChange={(e) => setVoiceProvider(e.target.value)}>
            {VOICE_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <div className="field-hint">
            연습할 땐 ElevenLabs(무료 티어), 실전은 fal.ai, 대량 운영으로 넘어가면 CLOVA를 고려하세요.
          </div>
        </div>

        {error && <div style={{ color: '#b91c1c', marginBottom: 16, fontSize: 13 }}>{error}</div>}

        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? '제작 요청 중...' : '쇼츠 만들기'}
        </button>
      </form>
    </div>
  );
}
