import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { getCaptionPreset } from './captionPresets.js';
import { getCaptionAnimation } from './captionAnimations.js';

function useAnimationStyle(animationId, startMs) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;
  const elapsed = startMs != null ? nowMs - startMs : 0;

  if (animationId === 'pop') {
    const scale = interpolate(elapsed, [0, 120, 220], [0.4, 1.18, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return { transform: `scale(${scale})` };
  }

  if (animationId === 'shake') {
    // 등장 후 400ms 동안만 흔들리고, 진폭이 점점 줄어들며 멈춘다.
    const decay = interpolate(elapsed, [0, 400], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const x = Math.sin(elapsed / 35) * 10 * decay;
    return { transform: `translateX(${x}px)` };
  }

  if (animationId === 'fire') {
    // 계속 미세하게 흔들리는 불꽃 느낌 + 아래에서 정의하는 그라디언트/글로우와 함께 쓰인다.
    const y = Math.sin(elapsed / 90) * 3;
    return { transform: `translateY(${y}px)` };
  }

  return {};
}

export function CaptionText({ text, presetId, animationId, startMs, override }) {
  if (!text) return null;
  // override: U-OneShot 컷대리 4단계(자막 스타일 커스텀)에서 프리셋 8종 대신 색상/폰트크기/외곽선/
  // 배경을 직접 지정할 때 쓰는 부분 오버라이드. 없으면 프리셋을 그대로 쓴다.
  const preset = { ...getCaptionPreset(presetId), ...(override || {}) };
  const animation = getCaptionAnimation(animationId);
  const animStyle = useAnimationStyle(animationId, startMs);
  const isFire = animation === getCaptionAnimation('fire') && animationId === 'fire';

  return (
    <div
      style={{
        display: 'inline-block',
        padding: preset.backgroundColor ? (preset.pill ? '10px 32px' : '14px 28px') : '0',
        borderRadius: preset.backgroundColor ? (preset.pill ? 9999 : 16) : 0,
        backgroundColor: preset.backgroundColor || 'transparent',
        maxWidth: '86%',
        textAlign: 'center',
        ...animStyle,
      }}
    >
      <span
        style={{
          fontFamily: preset.fontFamily,
          fontWeight: preset.fontWeight,
          fontSize: preset.fontSize,
          color: isFire ? 'transparent' : preset.color,
          lineHeight: 1.3,
          whiteSpace: 'pre-wrap',
          WebkitTextStroke: preset.outlineColor ? `${preset.outlineWidth}px ${preset.outlineColor}` : undefined,
          paintOrder: 'stroke fill',
          textShadow: isFire
            ? '0 0 18px rgba(255,120,0,0.85), 0 0 36px rgba(255,60,0,0.6)'
            : preset.shadow
            ? '0 4px 10px rgba(0,0,0,0.55)'
            : undefined,
          backgroundImage: isFire ? 'linear-gradient(180deg, #fff6a0, #ff9d2e, #ff3b00)' : undefined,
          backgroundClip: isFire ? 'text' : undefined,
          WebkitBackgroundClip: isFire ? 'text' : undefined,
        }}
      >
        {text}
      </span>
    </div>
  );
}
