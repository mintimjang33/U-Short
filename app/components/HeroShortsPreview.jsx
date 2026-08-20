'use client';

import { useEffect, useState } from 'react';

// 실제 remotion/src/layouts/*.jsx, captionPresets.js의 스타일 값을 그대로 옮긴 정적 목업.
// (렌더링된 영상이 아니라 CSS로 재현한 미리보기 — 값은 전부 실제 소스에서 가져옴)
function CaptionPill({ text, preset }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: preset.backgroundColor ? (preset.pill ? '10px 24px' : '10px 18px') : 0,
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

const SAMPLES = [
  {
    kind: 'info',
    image: 'https://picsum.photos/seed/ushort-sample-1/540/620',
    titleLine1: '제주 숨은 카페',
    titleLine2: '노을 맛집 3곳',
    captionText: '여기 진짜 인생샷 나옵니다',
    caption: { fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 58, color: '#ffffff', backgroundColor: null, outlineColor: '#000000', outlineWidth: 8, shadow: false },
  },
  {
    kind: 'card',
    image: 'https://picsum.photos/seed/ushort-sample-2/540/960',
    titleLine1: '연말정산 미리',
    titleLine2: '준비하는 법',
    captionText: '12월에 이거 하나면 끝',
    caption: { fontFamily: 'Pretendard, sans-serif', fontWeight: 700, fontSize: 52, color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.75)', outlineColor: null, outlineWidth: 0, shadow: false },
  },
  {
    kind: 'full-focused',
    image: 'https://picsum.photos/seed/ushort-sample-3/540/960',
    titleLine1: '자취 필수템',
    titleLine2: '10가지 추천',
    captionText: '이거 없으면 후회함',
    caption: { fontFamily: 'Pretendard, sans-serif', fontWeight: 700, fontSize: 50, color: '#ffffff', backgroundColor: '#ff6fa5', outlineColor: null, outlineWidth: 0, shadow: false, pill: true },
  },
];

export function HeroShortsPreview() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((v) => (v + 1) % SAMPLES.length), 3200);
    return () => clearInterval(id);
  }, []);

  const s = SAMPLES[active];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div
        style={{
          width: 280,
          aspectRatio: '9 / 16',
          borderRadius: 32,
          overflow: 'hidden',
          position: 'relative',
          background: '#000',
          boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
          border: '1px solid #22222f',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            zIndex: 2,
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            background: 'linear-gradient(135deg, #fb923c, #ec4899, #8b5cf6)',
            padding: '5px 12px',
            borderRadius: 9999,
          }}
        >
          완성 쇼츠
        </span>

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
                  padding: '0 24px',
                }}
              >
                <div style={{ textAlign: 'center', fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', lineHeight: 1.25 }}>
                  <div>{s.titleLine1}</div>
                  <div>{s.titleLine2}</div>
                </div>
              </div>
            </div>
            <div style={{ position: 'absolute', top: '62%', left: 0, right: 0, height: '38%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
              <CaptionPill text={s.captionText} preset={s.caption} />
            </div>
          </>
        )}

        {s.kind === 'card' && (
          <div style={{ position: 'absolute', inset: 10, borderRadius: 24, overflow: 'hidden' }}>
            <img src={s.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.85) 100%)' }} />
            <div style={{ position: 'absolute', top: 28, left: 0, right: 0, textAlign: 'center', fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', padding: '0 20px', lineHeight: 1.25 }}>
              <div>{s.titleLine1}</div>
              <div>{s.titleLine2}</div>
            </div>
            <div style={{ position: 'absolute', bottom: 26, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
              <CaptionPill text={s.captionText} preset={s.caption} />
            </div>
          </div>
        )}

        {s.kind === 'full-focused' && (
          <>
            <img src={s.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.75) 100%)' }} />
            <div style={{ position: 'absolute', top: 28, left: 0, right: 0, textAlign: 'center', fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', padding: '0 22px', lineHeight: 1.25 }}>
              <div>{s.titleLine1}</div>
              <div>{s.titleLine2}</div>
            </div>
            <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
              <CaptionPill text={s.captionText} preset={s.caption} />
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {SAMPLES.map((_, i) => (
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
