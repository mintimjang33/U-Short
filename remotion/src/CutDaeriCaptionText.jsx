import React from 'react';

// U-OneShot 컷대리 4단계(자막 스타일) 전용 캡션 렌더러 — 신규 파일, 기존 CaptionText.jsx(다른
// 5개 숏폼 레이아웃이 쓰는 8종 프리셋 시스템)는 건드리지 않는다. 2026-08-30 재로그인 재실측 결과
// 컷대리 쪽은 프리셋 묶음이 아니라 줄수/크기/위치/폰트/색상/윤곽선/배경이 전부 독립 조절되는
// 방식이었어서, 그 구조를 그대로 반영하는 별도 컴포넌트로 분리했다.
//
// 구글 폰트 3종(나눔고딕/Noto Sans KR/나눔명조)은 @import로, 구글폰트에 없는 G마켓 산스/카페24
// 써라운드는 공개 CDN(mirror)의 @font-face로 로드한다 — Remotion 렌더러는 헤드리스 크로미움이라
// 렌더 시점에 실제로 이 리소스를 네트워크로 가져올 수 있다(이미지/오디오 URL을 이미 그렇게 가져오는
// 것과 동일한 방식).
const FONT_FACE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&family=Noto+Sans+KR:wght@400;500;700;900&family=Nanum+Myeongjo:wght@400;700;800&display=swap');
@font-face {
  font-family: 'GmarketSans';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.0/GmarketSansMedium.woff2') format('woff2');
  font-weight: 500;
}
@font-face {
  font-family: 'Cafe24Ssurround';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2107@1.1/Cafe24Ssurround.woff2') format('woff2');
  font-weight: 400;
}
`;

const BACKGROUND_PADDING = { none: 0, thin: '2px 10px', thick: '10px 20px' };

export function CutDaeriCaptionText({ text, style }) {
  if (!text) return null;
  const s = style || {};
  const lineCount = s.lineCount || 2;
  const background = s.background || 'none';

  return (
    <>
      <style>{FONT_FACE_CSS}</style>
      <div
        style={{
          display: 'inline-block',
          padding: BACKGROUND_PADDING[background],
          borderRadius: background === 'none' ? 0 : 12,
          backgroundColor: background === 'none' ? 'transparent' : 'rgba(0,0,0,0.75)',
          maxWidth: '86%',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: s.fontFamily || 'Pretendard, sans-serif',
            fontWeight: 800,
            fontSize: s.fontSize || 24,
            color: s.color || '#ffffff',
            lineHeight: 1.3,
            whiteSpace: 'pre-wrap',
            WebkitTextStroke: s.outlineEnabled ? `${s.outlineWidth ?? 2}px #000000` : undefined,
            paintOrder: 'stroke fill',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: lineCount,
            overflow: 'hidden',
          }}
        >
          {text}
        </span>
      </div>
    </>
  );
}
