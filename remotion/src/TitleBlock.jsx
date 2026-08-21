import React from 'react';
import { getTitlePreset } from './titlePresets.js';

// 레이아웃 5종이 전부 공유하는 제목(title.line1/line2) 렌더러.
// "발견하기" 템플릿 44종 = 레이아웃(이미 구현됨) × 이 제목 스타일 프리셋의 조합이라, 여기 하나만
// 프리셋 기반으로 만들면 모든 레이아웃에서 동일하게 스타일 선택이 가능해진다.
function TitleLine({ text, style, fontSize }) {
  if (!text) return null;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: style.backgroundColor ? '4px 16px' : 0,
        borderRadius: style.backgroundColor ? 8 : 0,
        backgroundColor: style.backgroundColor || 'transparent',
        fontFamily: 'Pretendard, sans-serif',
        fontWeight: 800,
        fontSize,
        color: style.color,
        lineHeight: 1.25,
        WebkitTextStroke: style.outlineColor ? `${style.outlineWidth}px ${style.outlineColor}` : undefined,
        paintOrder: 'stroke fill',
      }}
    >
      {text}
    </span>
  );
}

export function TitleBlock({ line1, line2, presetId, fontSize = 64 }) {
  const preset = getTitlePreset(presetId);
  if (!line1 && !line2) return null;
  return (
    <div style={{ textAlign: 'center' }}>
      <div>
        <TitleLine text={line1} style={preset.line1} fontSize={fontSize} />
      </div>
      <div>
        <TitleLine text={line2} style={preset.line2} fontSize={fontSize} />
      </div>
    </div>
  );
}
