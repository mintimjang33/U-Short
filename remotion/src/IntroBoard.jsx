import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { getIntroPreset } from './introPresets.js';

// 본문 시작 전 1~2초간 보여주는 제목 전용 화면.
export function IntroBoard({ title = {}, presetId }) {
  const frame = useCurrentFrame();
  const preset = getIntroPreset(presetId);
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, 12], [0.9, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: preset.background, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: 'center', padding: '0 60px' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>{preset.badge}</div>
        {title.line1 && (
          <div style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 60, color: preset.accent, lineHeight: 1.3 }}>
            {title.line1}
          </div>
        )}
        {title.line2 && (
          <div style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 60, color: preset.accent, lineHeight: 1.3 }}>
            {title.line2}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
