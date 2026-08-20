'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LAYOUTS, CAPTION_PRESET_LIST } from '../../../../lib/options.js';
import { CAPTION_PRESETS } from '../../../../remotion/src/captionPresets.js';

function Pill({ selected, onClick, children }) {
  return (
    <button type="button" className={`pill ${selected ? 'selected' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

function CaptionPreview({ text, preset }) {
  if (!preset) return null;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: preset.backgroundColor ? (preset.pill ? '10px 22px' : '10px 16px') : 0,
        borderRadius: preset.backgroundColor ? (preset.pill ? 9999 : 10) : 0,
        backgroundColor: preset.backgroundColor || 'transparent',
        fontFamily: preset.fontFamily,
        fontWeight: preset.fontWeight,
        fontSize: Math.round(preset.fontSize * 0.34),
        color: preset.color,
        WebkitTextStroke: preset.outlineColor ? `${preset.outlineWidth * 0.34}px ${preset.outlineColor}` : undefined,
        paintOrder: 'stroke fill',
        textShadow: preset.shadow ? '0 4px 10px rgba(0,0,0,0.55)' : undefined,
        textAlign: 'center',
        lineHeight: 1.3,
      }}
    >
      {text}
    </span>
  );
}

// 상단 이미지/하단 자막 2분할 레이아웃(info, image-dark 공용) 미리보기
function SplitPreview({ imageUrl, titleLine1, titleLine2, captionText, captionPreset, dark }) {
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '62%', overflow: 'hidden', background: '#1c1c2b' }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4a5c', fontSize: 13 }}>
            사진을 넣으면 여기에 바로 보여요
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: dark
              ? 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 30%, rgba(5,5,7,0) 70%, #050507 100%)'
              : 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.35))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 24px',
          }}
        >
          {(titleLine1 || titleLine2) && (
            <div style={{ textAlign: 'center', fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', lineHeight: 1.25 }}>
              <div>{titleLine1}</div>
              <div>{titleLine2}</div>
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: '62%',
          left: 0,
          right: 0,
          height: '38%',
          background: dark ? 'linear-gradient(180deg, #0b0b10 0%, #050507 100%)' : '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
        }}
      >
        <CaptionPreview text={captionText} preset={captionPreset} />
      </div>
    </>
  );
}

function CardPreview({ imageUrl, titleLine1, titleLine2, captionText, captionPreset }) {
  return (
    <div style={{ position: 'absolute', inset: 10, borderRadius: 24, overflow: 'hidden', background: '#1c1c2b' }}>
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4a5c', fontSize: 13 }}>
          사진을 넣으면 여기에 바로 보여요
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.85) 100%)' }} />
      {(titleLine1 || titleLine2) && (
        <div style={{ position: 'absolute', top: 28, left: 0, right: 0, textAlign: 'center', fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', padding: '0 20px', lineHeight: 1.25 }}>
          <div>{titleLine1}</div>
          <div>{titleLine2}</div>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 26, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
        <CaptionPreview text={captionText} preset={captionPreset} />
      </div>
    </div>
  );
}

function FullFocusedPreview({ imageUrl, titleLine1, titleLine2, captionText, captionPreset }) {
  return (
    <>
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4a5c', fontSize: 13, background: '#1c1c2b' }}>
          사진을 넣으면 여기에 바로 보여요
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.75) 100%)' }} />
      {(titleLine1 || titleLine2) && (
        <div style={{ position: 'absolute', top: 28, left: 0, right: 0, textAlign: 'center', fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', padding: '0 22px', lineHeight: 1.25 }}>
          <div>{titleLine1}</div>
          <div>{titleLine2}</div>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
        <CaptionPreview text={captionText} preset={captionPreset} />
      </div>
    </>
  );
}

export default function TemplatePlaygroundPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [layoutId, setLayoutId] = useState('info');
  const [captionPresetId, setCaptionPresetId] = useState(CAPTION_PRESET_LIST[0].id);
  const [titleLine1, setTitleLine1] = useState('제목 첫 줄');
  const [titleLine2, setTitleLine2] = useState('제목 둘째 줄');
  const [captionText, setCaptionText] = useState('여기에 자막 문구가 나와요');

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
  }

  const captionPreset = CAPTION_PRESETS[captionPresetId];

  function goMakeReal() {
    // 놀이터에서 고른 레이아웃/자막 프리셋을 그대로 들고 "새로 제작" 화면으로 넘어간다.
    // 업로드한 이미지는 로컬 object URL이라 서버로 못 넘기니, 저장/생성 단계에서 다시 올려야 함.
    const params = new URLSearchParams({ layoutId, captionPresetId });
    router.push(`/new?${params.toString()}`);
  }

  return (
    <div>
      <h1 className="page-title">무제한 템플릿 놀이터</h1>
      <p className="page-sub">
        내 자료로 컷과 움직임을 조합해 보고, 마음에 들면 그 설정 그대로 새로 제작하세요.
        파일은 서버에 업로드되지 않고 지금 이 브라우저에서만 사용돼요.
      </p>

      <div style={{ display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div className="field">
            <label>1. 사진 불러오기</label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} />
            <div className="field-hint">파일은 서버에 업로드되지 않으며 지금 이 브라우저에서만 사용됩니다.</div>
          </div>

          <div className="field">
            <label>2. 템플릿 고르기</label>
            <div className="pill-group">
              {LAYOUTS.filter((l) => !l.requiresVideoUpload).map((l) => (
                <Pill key={l.id} selected={layoutId === l.id} onClick={() => setLayoutId(l.id)}>
                  {l.label}
                </Pill>
              ))}
            </div>
          </div>

          <div className="field">
            <label>3. 자막 스타일 고르기</label>
            <div className="pill-group">
              {CAPTION_PRESET_LIST.map((c) => (
                <Pill key={c.id} selected={captionPresetId === c.id} onClick={() => setCaptionPresetId(c.id)}>
                  {c.label}
                </Pill>
              ))}
            </div>
          </div>

          <div className="field">
            <label>4. 제목</label>
            <input type="text" value={titleLine1} onChange={(e) => setTitleLine1(e.target.value)} style={{ marginBottom: 8 }} />
            <input type="text" value={titleLine2} onChange={(e) => setTitleLine2(e.target.value)} />
          </div>

          <div className="field">
            <label>5. 자막 문구</label>
            <input type="text" value={captionText} onChange={(e) => setCaptionText(e.target.value)} />
          </div>

          <button className="primary-btn" onClick={goMakeReal}>
            이 설정으로 새로 제작하기
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', flex: '0 0 auto' }}>
          <div
            style={{
              width: 280,
              aspectRatio: '9 / 16',
              borderRadius: 24,
              overflow: 'hidden',
              position: 'relative',
              background: '#000',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              border: '1px solid #2a2a3c',
            }}
          >
            {layoutId === 'info' && (
              <SplitPreview imageUrl={imageUrl} titleLine1={titleLine1} titleLine2={titleLine2} captionText={captionText} captionPreset={captionPreset} />
            )}
            {layoutId === 'image-dark' && (
              <SplitPreview imageUrl={imageUrl} titleLine1={titleLine1} titleLine2={titleLine2} captionText={captionText} captionPreset={captionPreset} dark />
            )}
            {layoutId === 'card' && (
              <CardPreview imageUrl={imageUrl} titleLine1={titleLine1} titleLine2={titleLine2} captionText={captionText} captionPreset={captionPreset} />
            )}
            {layoutId === 'full-focused' && (
              <FullFocusedPreview imageUrl={imageUrl} titleLine1={titleLine1} titleLine2={titleLine2} captionText={captionText} captionPreset={captionPreset} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
