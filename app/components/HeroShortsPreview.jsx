'use client';

import { useEffect, useState } from 'react';
import { SAMPLES } from './shortsSamples.js';

// 실제 remotion/src/layouts/*.jsx, captionPresets.js의 스타일 값을 그대로 옮긴 정적 목업.
// (렌더링된 영상이 아니라 CSS로 재현한 미리보기 — 값은 전부 실제 소스에서 가져옴)
function CaptionPill({ text, preset, scale = 1 }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: preset.backgroundColor ? (preset.pill ? `${10 * scale}px ${24 * scale}px` : `${10 * scale}px ${18 * scale}px`) : 0,
        borderRadius: preset.backgroundColor ? (preset.pill ? 9999 : 10) : 0,
        backgroundColor: preset.backgroundColor || 'transparent',
        fontFamily: preset.fontFamily,
        fontWeight: preset.fontWeight,
        fontSize: Math.round(preset.fontSize * 0.34 * scale),
        color: preset.color,
        WebkitTextStroke: preset.outlineColor ? `${preset.outlineWidth * 0.34 * scale}px ${preset.outlineColor}` : undefined,
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

// 실제 layouts/*.jsx 구조(상단 62%+하단 38%, 카드형, 풀스크린, 다크 2분할)를 CSS로 재현한 목업 카드.
export function ShortsMockupCard({ sample, width = 280, badge = true }) {
  const s = sample;
  const scale = width / 280;
  return (
    <div
      style={{
        width,
        aspectRatio: '9 / 16',
        borderRadius: 24 * scale,
        overflow: 'hidden',
        position: 'relative',
        background: '#000',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        border: '1px solid #22222f',
      }}
    >
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: 14 * scale,
            left: 14 * scale,
            zIndex: 2,
            fontSize: 11 * scale,
            fontWeight: 700,
            color: '#fff',
            background: 'linear-gradient(135deg, #fb923c, #ec4899, #8b5cf6)',
            padding: `${5 * scale}px ${12 * scale}px`,
            borderRadius: 9999,
          }}
        >
          완성 쇼츠
        </span>
      )}

      {s.kind === 'info' && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '62%', overflow: 'hidden' }}>
            <img src={s.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.35))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: `0 ${24 * scale}px`,
              }}
            >
              <div style={{ textAlign: 'center', fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 22 * scale, color: '#fff', lineHeight: 1.25 }}>
                <div>{s.titleLine1}</div>
                <div>{s.titleLine2}</div>
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', top: '62%', left: 0, right: 0, height: '38%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `0 ${16 * scale}px` }}>
            <CaptionPill text={s.captionText} preset={s.caption} scale={scale} />
          </div>
        </>
      )}

      {s.kind === 'card' && (
        <div style={{ position: 'absolute', inset: 10 * scale, borderRadius: 24 * scale, overflow: 'hidden' }}>
          <img src={s.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.85) 100%)' }} />
          <div style={{ position: 'absolute', top: 28 * scale, left: 0, right: 0, textAlign: 'center', fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 20 * scale, color: '#fff', padding: `0 ${20 * scale}px`, lineHeight: 1.25 }}>
            <div>{s.titleLine1}</div>
            <div>{s.titleLine2}</div>
          </div>
          <div style={{ position: 'absolute', bottom: 26 * scale, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: `0 ${16 * scale}px` }}>
            <CaptionPill text={s.captionText} preset={s.caption} scale={scale} />
          </div>
        </div>
      )}

      {s.kind === 'full-focused' && (
        <>
          <img src={s.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.75) 100%)' }} />
          <div style={{ position: 'absolute', top: 28 * scale, left: 0, right: 0, textAlign: 'center', fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 20 * scale, color: '#fff', padding: `0 ${22 * scale}px`, lineHeight: 1.25 }}>
            <div>{s.titleLine1}</div>
            <div>{s.titleLine2}</div>
          </div>
          <div style={{ position: 'absolute', bottom: 30 * scale, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: `0 ${16 * scale}px` }}>
            <CaptionPill text={s.captionText} preset={s.caption} scale={scale} />
          </div>
        </>
      )}

      {s.kind === 'image-dark' && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '62%', overflow: 'hidden' }}>
            <img src={s.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 30%, rgba(5,5,7,0) 70%, #050507 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: `0 ${24 * scale}px`,
              }}
            >
              <div style={{ textAlign: 'center', fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 22 * scale, color: '#fff', lineHeight: 1.25 }}>
                <div>{s.titleLine1}</div>
                <div>{s.titleLine2}</div>
              </div>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              top: '62%',
              left: 0,
              right: 0,
              height: '38%',
              background: 'linear-gradient(180deg, #0b0b10 0%, #050507 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: `0 ${16 * scale}px`,
            }}
          >
            <CaptionPill text={s.captionText} preset={s.caption} scale={scale} />
          </div>
        </>
      )}
    </div>
  );
}

export function HeroShortsPreview() {
  const [active, setActive] = useState(0);
  const rotating = SAMPLES.slice(0, 3);

  useEffect(() => {
    const id = setInterval(() => setActive((v) => (v + 1) % rotating.length), 3200);
    return () => clearInterval(id);
  }, [rotating.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <ShortsMockupCard sample={rotating[active]} />
      <div style={{ display: 'flex', gap: 6 }}>
        {rotating.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`샘플 ${i + 1}`}
            style={{
              width: 6,
              height: 6,
              borderRadius: 9999,
              border: 'none',
              cursor: 'pointer',
              background: i === active ? '#f4f4f8' : '#3a3a4a',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
