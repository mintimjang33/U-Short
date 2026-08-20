'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import {
  SCRIPT_STYLES,
  OUTPUT_LANGUAGES,
  LENGTH_MODES,
  LAYOUTS,
  CAPTION_PRESET_LIST,
  SCRIPT_PROVIDERS,
  VOICE_PROVIDERS,
  VOICE_PRESET_LIST,
  INTRO_TEMPLATE_LIST,
} from '../../../lib/options.js';

const VOICE_LANG_LABEL = { ko: '한국어', ja: '일본어', en: '영어', etc: '기타' };

function Pill({ selected, onClick, children }) {
  return (
    <button type="button" className={`pill ${selected ? 'selected' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 템플릿 놀이터(/lab/template-playground)에서 고른 레이아웃/자막 프리셋을 쿼리로 넘겨받는다.
  const initialLayoutId = searchParams.get('layoutId') || 'info';
  const initialCaptionPresetId = searchParams.get('captionPresetId') || CAPTION_PRESET_LIST[0].id;
  const [sourceMode, setSourceMode] = useState('link'); // 'link' | 'manual' | 'topic'
  const [sourceUrl, setSourceUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('summary');
  const [outputLanguage, setOutputLanguage] = useState('original');
  const [lengthMode, setLengthMode] = useState('shortform');
  const [layoutId, setLayoutId] = useState(initialLayoutId);
  const [captionPresetId, setCaptionPresetId] = useState(initialCaptionPresetId);
  const [scriptProvider, setScriptProvider] = useState('claude');
  const [voiceProvider, setVoiceProvider] = useState('fal');
  const [voiceId, setVoiceId] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#0a0a0a');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState('');
  const [extraInfoText, setExtraInfoText] = useState('');
  const [introEnabled, setIntroEnabled] = useState(false);
  const [introTemplateId, setIntroTemplateId] = useState(INTRO_TEMPLATE_LIST[0].id);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // 2단계 흐름: 1) 소스/설정 입력 → 대본 생성  2) 생성된 대본 확인/수정 + 스톡영상 선택 → 최종 제출
  const [step, setStep] = useState(1);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState(null);
  const [scriptTitleLine1, setScriptTitleLine1] = useState('');
  const [scriptTitleLine2, setScriptTitleLine2] = useState('');
  const [scriptNarration, setScriptNarration] = useState('');
  const [extractedImages, setExtractedImages] = useState([]);
  const [searchingStock, setSearchingStock] = useState(false);
  const [stockKeywords, setStockKeywords] = useState([]);
  const [stockVideos, setStockVideos] = useState([]);
  const [selectedStockVideoId, setSelectedStockVideoId] = useState(null);

  // 핸드폰 QR 사진/영상 가져오기
  const [mobileToken, setMobileToken] = useState(null);
  const [mobileQrDataUrl, setMobileQrDataUrl] = useState(null);
  const [mobileFiles, setMobileFiles] = useState([]);
  const [selectedMobileUrl, setSelectedMobileUrl] = useState(null);
  const mobilePollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (mobilePollRef.current) clearInterval(mobilePollRef.current);
    };
  }, []);

  async function startMobileUpload() {
    const token = crypto.randomUUID();
    setMobileToken(token);
    setMobileFiles([]);
    setSelectedMobileUrl(null);
    const url = `${window.location.origin}/mobile-upload/${token}`;
    setMobileQrDataUrl(await QRCode.toDataURL(url, { width: 220, margin: 1 }));

    if (mobilePollRef.current) clearInterval(mobilePollRef.current);
    mobilePollRef.current = setInterval(async () => {
      const res = await fetch(`/api/mobile-upload/${token}`);
      const data = await res.json().catch(() => null);
      if (data?.files) setMobileFiles(data.files);
    }, 3000);
  }

  function selectMobileFile(file) {
    setSelectedMobileUrl(file.url);
    setSelectedStockVideoId(null);
    const isVideo = file.type?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name || '');
    if (isVideo) {
      setBackgroundVideoUrl(file.url);
      setBackgroundImageUrl('');
    } else {
      setBackgroundImageUrl(file.url);
      setBackgroundVideoUrl('');
    }
  }

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

  async function handleVideoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '업로드 실패');
      setBackgroundVideoUrl(data.url);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingVideo(false);
    }
  }

  async function searchStockVideos(titleLine1, titleLine2, narration) {
    setSearchingStock(true);
    try {
      const res = await fetch('/api/stock-media/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleLine1, titleLine2, narration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '스톡영상 검색 실패');
      setStockKeywords(data.keywords || []);
      setStockVideos(data.videos || []);
    } catch (err) {
      // 스톡영상은 부가 기능이라, 실패해도 대본 생성 자체는 막지 않고 조용히 빈 목록으로 둔다.
      setStockKeywords([]);
      setStockVideos([]);
    } finally {
      setSearchingStock(false);
    }
  }

  async function handleGenerateScript(e) {
    e.preventDefault();
    if (sourceMode === 'link' && !sourceUrl.trim()) {
      setError('URL을 입력해주세요.');
      return;
    }
    if (sourceMode === 'manual' && manualText.trim().length < 10) {
      setError('대본을 10자 이상 입력해주세요.');
      return;
    }
    if (sourceMode === 'topic' && !topic.trim()) {
      setError('조사할 주제를 입력해주세요.');
      return;
    }
    setGeneratingScript(true);
    setError(null);
    setScriptError(null);

    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: sourceMode === 'link' ? sourceUrl.trim() : null,
          sourceText: sourceMode === 'manual' ? manualText.trim() : null,
          topic: sourceMode === 'topic' ? topic.trim() : null,
          style,
          outputLanguage,
          lengthMode,
          scriptProvider,
          planningMode: sourceMode === 'manual' ? 'direct' : 'auto',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '대본 생성에 실패했습니다.');

      setScriptTitleLine1(data.titleLine1);
      setScriptTitleLine2(data.titleLine2 || '');
      setScriptNarration(data.narration);
      setExtractedImages(data.images || []);
      setStep(2);
      searchStockVideos(data.titleLine1, data.titleLine2, data.narration);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingScript(false);
    }
  }

  async function handleFinalSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const selectedStock = stockVideos.find((v) => v.id === selectedStockVideoId);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // preGeneratedScript가 있으면 pipeline이 sourceText로 다시 대본을 만들지 않지만,
          // /api/jobs는 sourceUrl/sourceText 중 하나가 없으면 요청 자체를 거부하므로 채워서 보낸다.
          sourceText: scriptNarration,
          style,
          outputLanguage,
          lengthMode,
          layoutId,
          captionPresetId,
          scriptProvider,
          voiceProvider,
          voice: voiceId || null,
          introEnabled,
          introTemplateId,
          preGeneratedScript: { titleLine1: scriptTitleLine1, titleLine2: scriptTitleLine2, narration: scriptNarration },
          background: {
            color: backgroundColor,
            imageUrl: selectedStock ? null : backgroundImageUrl || extractedImages[0] || null,
            videoUrl: selectedStock ? selectedStock.videoUrl : backgroundVideoUrl || null,
          },
          extraInfo: extraInfoText ? [{ text: extraInfoText, x: 24, y: 24 }] : [],
          planningMode: 'direct',
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
        {sourceMode === 'link' && '네이버블로그, 티스토리 등 이미 게시된 링크로 쇼츠를 자동 제작해요.'}
        {sourceMode === 'manual' && '이미 다듬어둔 대본이 있다면 그대로 붙여넣으세요. AI가 내용을 다시 쓰지 않고 제목만 만들어요.'}
        {sourceMode === 'topic' && '주제만 입력하면 관련 뉴스를 조사해서 AI가 대본을 새로 기획해요.'}
      </p>

      {step === 1 && (
      <form onSubmit={handleGenerateScript} className="card" style={{ maxWidth: 640 }}>
        <div className="field">
          <label>소스</label>
          <div className="pill-group">
            <Pill selected={sourceMode === 'link'} onClick={() => setSourceMode('link')}>
              🔗 URL
            </Pill>
            <Pill selected={sourceMode === 'manual'} onClick={() => setSourceMode('manual')}>
              📝 직접 대본 작성
            </Pill>
            <Pill selected={sourceMode === 'topic'} onClick={() => setSourceMode('topic')}>
              🔍 주제로 조사하기
            </Pill>
          </div>
        </div>

        {sourceMode === 'link' && (
          <div className="field">
            <label>URL</label>
            <input
              type="url"
              placeholder="https://blog.naver.com/..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              required={sourceMode === 'link'}
            />
          </div>
        )}

        {sourceMode === 'topic' && (
          <div className="field">
            <label>조사할 주제</label>
            <input
              type="text"
              placeholder="예: 2026 최저임금 인상"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required={sourceMode === 'topic'}
            />
            <div className="field-hint">네이버 뉴스에서 관련 기사를 찾아 대본 재료로 씁니다.</div>
          </div>
        )}

        {sourceMode === 'manual' && (
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
          <label>
            <input
              type="checkbox"
              checked={introEnabled}
              onChange={(e) => setIntroEnabled(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            인트로보드 사용 (본문 시작 전 1.8초짜리 제목 전용 화면)
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
          <label>배경색</label>
          <input type="text" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
        </div>

        <div className="field">
          <label>배경 이미지 (선택, 안 넣으면 대표 이미지를 자동으로 씀)</label>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileUpload} />
          {uploading && <div className="field-hint">업로드 중...</div>}
          {uploadError && <div className="field-hint" style={{ color: '#fda4af' }}>{uploadError}</div>}
          {backgroundImageUrl && (
            <div className="field-hint">
              업로드됨: <a href={backgroundImageUrl} target="_blank" rel="noreferrer">미리보기</a>{' '}
              <button type="button" onClick={() => setBackgroundImageUrl('')} style={{ marginLeft: 8 }}>
                제거
              </button>
            </div>
          )}
        </div>

        {LAYOUTS.find((l) => l.id === layoutId)?.requiresVideoUpload && (
          <div className="field">
            <label>인물 영상 업로드 (필수 · 바이럴민트는 직접 촬영한 영상을 배경으로 씀)</label>
            <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoUpload} />
            {uploadingVideo && <div className="field-hint">업로드 중...</div>}
            {backgroundVideoUrl && (
              <div className="field-hint">
                업로드됨: <a href={backgroundVideoUrl} target="_blank" rel="noreferrer">미리보기</a>{' '}
                <button type="button" onClick={() => setBackgroundVideoUrl('')} style={{ marginLeft: 8 }}>
                  제거
                </button>
              </div>
            )}
          </div>
        )}

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

        {voiceProvider === 'fal' && (
          <div className="field">
            <label>음성 페르소나</label>
            <div className="pill-group">
              <Pill selected={!voiceId} onClick={() => setVoiceId('')}>기본 (Rachel)</Pill>
              {VOICE_PRESET_LIST.map((v) => (
                <Pill key={v.id} selected={voiceId === v.id} onClick={() => setVoiceId(v.id)}>
                  {VOICE_LANG_LABEL[v.lang]} · {v.name} — {v.description}
                </Pill>
              ))}
            </div>
          </div>
        )}

        {error && <div style={{ color: '#fda4af', marginBottom: 16, fontSize: 13 }}>{error}</div>}

        <button type="submit" className="primary-btn" disabled={generatingScript}>
          {generatingScript ? '대본 생성 중...' : '대본 생성하기'}
        </button>
      </form>
      )}

      {step === 2 && (
        <form onSubmit={handleFinalSubmit} className="card" style={{ maxWidth: 640 }}>
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{ background: 'none', border: 'none', color: '#9c9cb5', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16 }}
          >
            ← 설정으로 돌아가기
          </button>

          <div className="field">
            <label>제목 (수정 가능)</label>
            <input type="text" value={scriptTitleLine1} onChange={(e) => setScriptTitleLine1(e.target.value)} style={{ marginBottom: 8 }} />
            <input type="text" value={scriptTitleLine2} onChange={(e) => setScriptTitleLine2(e.target.value)} />
          </div>

          <div className="field">
            <label>내레이션 (수정 가능)</label>
            <textarea rows={6} value={scriptNarration} onChange={(e) => setScriptNarration(e.target.value)} />
            <div className="field-hint">{scriptNarration.trim().length}자</div>
          </div>

          <div className="field">
            <label>대본에 맞는 스톡영상 (선택)</label>
            {searchingStock && <div className="field-hint">스톡영상을 찾는 중...</div>}
            {!searchingStock && stockVideos.length === 0 && (
              <div className="field-hint">추천 영상을 찾지 못했어요. 배경 이미지/영상을 직접 업로드해주세요.</div>
            )}
            {!searchingStock && stockVideos.length > 0 && (
              <>
                <div className="field-hint" style={{ marginBottom: 8 }}>검색 키워드: {stockKeywords.join(', ')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                  {stockVideos.map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      onClick={() => {
                        setSelectedStockVideoId(selectedStockVideoId === v.id ? null : v.id);
                        setSelectedMobileUrl(null);
                      }}
                      style={{
                        padding: 0,
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: selectedStockVideoId === v.id ? '3px solid #a78bfa' : '1px solid #2a2a3c',
                        cursor: 'pointer',
                        background: '#000',
                        aspectRatio: '9 / 16',
                        position: 'relative',
                      }}
                    >
                      <img src={v.thumbnail} alt={v.keyword} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 6 }}>
                        {v.keyword}
                      </span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => searchStockVideos(scriptTitleLine1, scriptTitleLine2, scriptNarration)} style={{ marginTop: 8, fontSize: 12, color: '#9c9cb5', background: 'none', border: 'none', cursor: 'pointer' }}>
                  다시 찾기
                </button>
              </>
            )}
          </div>

          {!selectedStockVideoId && (
            <div className="field">
              <label>또는 핸드폰에서 QR로 사진/영상 가져오기</label>
              {!mobileToken && (
                <button type="button" className="pill" onClick={startMobileUpload}>
                  📱 QR 코드 보이기
                </button>
              )}
              {mobileToken && (
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 8, flexWrap: 'wrap' }}>
                  {mobileQrDataUrl && (
                    <img src={mobileQrDataUrl} alt="QR 코드" style={{ width: 140, height: 140, borderRadius: 8, background: '#fff', padding: 8 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div className="field-hint">폰 카메라로 이 QR을 찍으면 업로드 페이지가 열려요.</div>
                    {mobileFiles.length === 0 && <div className="field-hint">아직 올라온 파일이 없어요...</div>}
                    {mobileFiles.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        {mobileFiles.map((f) => (
                          <button
                            type="button"
                            key={f.url}
                            onClick={() => selectMobileFile(f)}
                            style={{
                              width: 64,
                              height: 64,
                              padding: 0,
                              borderRadius: 8,
                              overflow: 'hidden',
                              border: selectedMobileUrl === f.url ? '3px solid #a78bfa' : '1px solid #2a2a3c',
                              cursor: 'pointer',
                              background: '#000',
                            }}
                          >
                            {(f.type || '').startsWith('video/') ? (
                              <video src={f.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                            ) : (
                              <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!selectedStockVideoId && (
            <div className="field">
              <label>또는 직접 배경 이미지 업로드 (선택, 안 넣으면 대표 이미지를 자동으로 씀)</label>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileUpload} />
              {uploading && <div className="field-hint">업로드 중...</div>}
              {uploadError && <div className="field-hint" style={{ color: '#fda4af' }}>{uploadError}</div>}
              {backgroundImageUrl && (
                <div className="field-hint">
                  업로드됨: <a href={backgroundImageUrl} target="_blank" rel="noreferrer">미리보기</a>{' '}
                  <button type="button" onClick={() => setBackgroundImageUrl('')} style={{ marginLeft: 8 }}>
                    제거
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <div style={{ color: '#fda4af', marginBottom: 16, fontSize: 13 }}>{error}</div>}

          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? '제작 요청 중...' : '이대로 쇼츠 만들기'}
          </button>
        </form>
      )}
    </div>
  );
}
