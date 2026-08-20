import { LAYOUTS } from '../../../../lib/options.js';
import { CAPTION_PRESETS } from '../../../../remotion/src/captionPresets.js';
import { INTRO_PRESETS } from '../../../../remotion/src/introPresets.js';

const LAYOUT_DESC = {
  info: '상단 62% 이미지 + 하단 38% 검은 자막바로 나뉜 기본형',
  card: '여백 있는 둥근 카드 안에 사진, 하단에 자막 오버레이',
  'full-focused': '이미지가 화면 전체를 채우고 자막은 하단에 떠있는 형태',
  'image-dark': 'info와 같은 2분할이지만 하단이 다크 그라디언트',
  'viral-mint': '실제 인물 영상을 배경으로 재생 (직접 업로드 필요)',
};

export default function TemplateGalleryPage() {
  return (
    <div>
      <h1 className="page-title">템플릿 갤러리</h1>
      <p className="page-sub">레이아웃·자막 프리셋·인트로보드를 실제 스타일 값 그대로 미리 볼 수 있어요.</p>

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: '28px 0 12px' }}>레이아웃 (5종)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
        {LAYOUTS.map((l) => (
          <div key={l.id} className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{l.label}</div>
            <div style={{ fontSize: 12, color: '#9c9cb5' }}>{LAYOUT_DESC[l.id]}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: '28px 0 12px' }}>자막 프리셋 (8종)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 32 }}>
        {Object.entries(CAPTION_PRESETS).map(([id, p]) => (
          <div
            key={id}
            style={{
              background: '#050507',
              borderRadius: 14,
              padding: '28px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 90,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: p.backgroundColor ? (p.pill ? '8px 20px' : '10px 18px') : 0,
                borderRadius: p.backgroundColor ? (p.pill ? 9999 : 12) : 0,
                backgroundColor: p.backgroundColor || 'transparent',
                fontFamily: p.fontFamily,
                fontWeight: p.fontWeight,
                fontSize: Math.round(p.fontSize * 0.45),
                color: p.color,
                WebkitTextStroke: p.outlineColor ? `${p.outlineWidth * 0.45}px ${p.outlineColor}` : undefined,
                paintOrder: 'stroke fill',
                textShadow: p.shadow ? '0 4px 10px rgba(0,0,0,0.55)' : undefined,
              }}
            >
              {p.label}
            </span>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: '28px 0 12px' }}>인트로보드 (10종)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {Object.entries(INTRO_PRESETS).map(([id, p]) => (
          <div
            key={id}
            style={{
              background: p.background,
              borderRadius: 14,
              padding: '24px 12px',
              textAlign: 'center',
              aspectRatio: '9/16',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{p.badge}</div>
            <div style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 15, color: p.accent, lineHeight: 1.4 }}>
              {p.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
