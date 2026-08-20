'use client';

import { useEffect, useMemo, useState } from 'react';
import { Player } from '@remotion/player';
import { InfoLayout } from '../../../remotion/src/layouts/InfoLayout.jsx';
import { CardLayout } from '../../../remotion/src/layouts/CardLayout.jsx';
import { FullFocusedLayout } from '../../../remotion/src/layouts/FullFocusedLayout.jsx';
import { ImageDarkLayout } from '../../../remotion/src/layouts/ImageDarkLayout.jsx';
import { ViralMintLayout } from '../../../remotion/src/layouts/ViralMintLayout.jsx';
import { LAYOUTS, CAPTION_PRESET_LIST } from '../../../lib/options.js';

const DUMMY_CAPTIONS = [
  { text: '예시 자막입니다', startMs: 0, endMs: 2000 },
  { text: '이렇게 보여요', startMs: 2000, endMs: 4000 },
];
const FPS = 30;
const DURATION_MS = 4000;

const TABS = ['제목', '부가정보', '배경', '자막'];

export default function TemplateEditorInner() {
  const [layoutId, setLayoutId] = useState('info');
  const [tab, setTab] = useState('제목');
  const [titleLine1, setTitleLine1] = useState('제목 첫번째줄');
  const [titleLine2, setTitleLine2] = useState('제목 두번째 줄');
  const [captionPresetId, setCaptionPresetId] = useState(CAPTION_PRESET_LIST[0].id);
  const [backgroundColor, setBackgroundColor] = useState('#0a0a0a');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [extraInfoText, setExtraInfoText] = useState('@내채널');
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const [savedTemplates, setSavedTemplates] = useState([]);
  const [loadedTemplateId, setLoadedTemplateId] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState(null);

  async function refreshTemplates() {
    setTemplatesLoading(true);
    try {
      const res = await fetch('/api/templates', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '템플릿 목록을 불러오지 못했습니다.');
      setSavedTemplates(data);
      setTemplatesError(null);
    } catch (err) {
      setTemplatesError(err.message);
    } finally {
      setTemplatesLoading(false);
    }
  }

  useEffect(() => {
    refreshTemplates();
  }, []);

  const LAYOUT_COMPONENTS = {
    info: InfoLayout,
    card: CardLayout,
    'full-focused': FullFocusedLayout,
    'image-dark': ImageDarkLayout,
    'viral-mint': ViralMintLayout,
  };
  const Component = LAYOUT_COMPONENTS[layoutId] || InfoLayout;

  const inputProps = useMemo(
    () => ({
      title: { line1: titleLine1, line2: titleLine2 },
      captions: DUMMY_CAPTIONS,
      captionPresetId,
      backgroundImageUrl: backgroundImageUrl || null,
      backgroundColor,
      audioSrc: null,
      extraInfo: extraInfoText ? [{ text: extraInfoText, x: 24, y: 24 }] : [],
    }),
    [titleLine1, titleLine2, captionPresetId, backgroundImageUrl, backgroundColor, extraInfoText, layoutId]
  );

  function handleLoadTemplate(id) {
    if (!id) {
      setLoadedTemplateId(null);
      return;
    }
    const t = savedTemplates.find((x) => x.id === id);
    if (!t) return;

    setLoadedTemplateId(t.id);
    setTemplateName(t.name);
    setLayoutId(t.layout_id);
    const config = t.config || {};
    setTitleLine1(config.title?.line1 || '');
    setTitleLine2(config.title?.line2 || '');
    setCaptionPresetId(config.captionPresetId || CAPTION_PRESET_LIST[0].id);
    setBackgroundColor(config.background?.color || '#0a0a0a');
    setBackgroundImageUrl(config.background?.imageUrl || '');
    setExtraInfoText(config.extraInfo?.[0]?.text || '');
    setSaveMessage(null);
  }

  function buildConfig() {
    return {
      title: { line1: titleLine1, line2: titleLine2 },
      captionPresetId,
      background: { color: backgroundColor, imageUrl: backgroundImageUrl || null },
      extraInfo: inputProps.extraInfo,
    };
  }

  async function handleSaveAsNew() {
    if (!templateName.trim()) {
      setSaveMessage('템플릿 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName.trim(), layoutId, config: buildConfig() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '저장 실패');
      setSaveMessage('새 템플릿으로 저장했어요.');
      setLoadedTemplateId(data.id);
      await refreshTemplates();
    } catch (err) {
      setSaveMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!loadedTemplateId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/templates/${loadedTemplateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName.trim(), layoutId, config: buildConfig() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '업데이트 실패');
      setSaveMessage('업데이트했어요.');
      await refreshTemplates();
    } catch (err) {
      setSaveMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!loadedTemplateId) return;
    setDeleting(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/templates/${loadedTemplateId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '삭제 실패');
      setLoadedTemplateId(null);
      setTemplateName('');
      setSaveMessage('삭제했어요.');
      await refreshTemplates();
    } catch (err) {
      setSaveMessage(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">템플릿 에디터</h1>
      <p className="page-sub">레이아웃을 고르고 제목·배경·자막을 커스터마이즈해보세요. (실시간 프리뷰)</p>

      <div className="field">
        <label>저장된 템플릿에서 불러오기</label>
        {templatesLoading && <div className="field-hint">불러오는 중...</div>}
        {templatesError && <div className="field-hint" style={{ color: '#fda4af' }}>{templatesError}</div>}
        {!templatesLoading && !templatesError && (
          <select value={loadedTemplateId || ''} onChange={(e) => handleLoadTemplate(e.target.value || null)}>
            <option value="">-- 새 템플릿 (저장된 템플릿 없음) --</option>
            {savedTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({LAYOUTS.find((l) => l.id === t.layout_id)?.label || t.layout_id})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="field">
        <label>레이아웃</label>
        <div className="pill-group">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`pill ${layoutId === l.id ? 'selected' : ''}`}
              onClick={() => setLayoutId(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="two-col">
        <div>
          <div className="preview-frame">
            <Player
              component={Component}
              inputProps={inputProps}
              durationInFrames={Math.ceil((DURATION_MS / 1000) * FPS)}
              fps={FPS}
              compositionWidth={1080}
              compositionHeight={1920}
              style={{ width: '100%', height: '100%' }}
              controls
              loop
              autoPlay
            />
          </div>
        </div>

        <div className="card">
          <div className="tab-row">
            {TABS.map((t) => (
              <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>

          {tab === '제목' && (
            <>
              <div className="field">
                <label>첫째줄</label>
                <input type="text" value={titleLine1} onChange={(e) => setTitleLine1(e.target.value)} />
              </div>
              <div className="field">
                <label>둘째줄</label>
                <input type="text" value={titleLine2} onChange={(e) => setTitleLine2(e.target.value)} />
              </div>
            </>
          )}

          {tab === '부가정보' && (
            <div className="field">
              <label>오버레이 텍스트</label>
              <input type="text" value={extraInfoText} onChange={(e) => setExtraInfoText(e.target.value)} />
              <div className="field-hint">채널명 워터마크 등 화면 좌상단에 계속 뜨는 텍스트예요.</div>
            </div>
          )}

          {tab === '배경' && (
            <>
              <div className="field">
                <label>배경색</label>
                <input type="text" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
              </div>
              <div className="field">
                <label>배경 이미지 URL (선택)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={backgroundImageUrl}
                  onChange={(e) => setBackgroundImageUrl(e.target.value)}
                />
                <div className="field-hint">비워두면 배경색만 표시돼요. 파일 업로드는 새 프로젝트 화면에서 가능해요.</div>
              </div>
            </>
          )}

          {tab === '자막' && (
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
          )}

          <div className="field" style={{ marginTop: 24, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
            <label>{loadedTemplateId ? '템플릿 이름 (수정 중)' : '내 템플릿으로 저장'}</label>
            <input
              type="text"
              placeholder="템플릿 이름"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {loadedTemplateId && (
              <button className="primary-btn" onClick={handleUpdate} disabled={saving}>
                {saving ? '저장 중...' : '업데이트'}
              </button>
            )}
            <button
              className="primary-btn"
              style={loadedTemplateId ? { background: '#1c1c2b', color: '#f4f4f8', border: '1px solid #6b6b85' } : undefined}
              onClick={handleSaveAsNew}
              disabled={saving}
            >
              {saving ? '저장 중...' : loadedTemplateId ? '다른 이름으로 저장' : '저장하기'}
            </button>
            {loadedTemplateId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: '#1c1c2b',
                  color: '#fda4af',
                  border: '1px solid rgba(244,63,94,0.35)',
                  borderRadius: 10,
                  padding: '12px 22px',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            )}
          </div>
          {saveMessage && <p style={{ fontSize: 13, marginTop: 8 }}>{saveMessage}</p>}
        </div>
      </div>
    </div>
  );
}
