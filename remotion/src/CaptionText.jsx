import React from 'react';
import { getCaptionPreset } from './captionPresets.js';

export function CaptionText({ text, presetId }) {
  if (!text) return null;
  const preset = getCaptionPreset(presetId);

  return (
    <div
      style={{
        display: 'inline-block',
        padding: preset.backgroundColor ? '14px 28px' : '0',
        borderRadius: preset.backgroundColor ? 16 : 0,
        backgroundColor: preset.backgroundColor || 'transparent',
        maxWidth: '86%',
      }}
    >
      <span
        style={{
          fontFamily: preset.fontFamily,
          fontWeight: preset.fontWeight,
          fontSize: preset.fontSize,
          color: preset.color,
          lineHeight: 1.3,
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          WebkitTextStroke: preset.outlineColor ? `${preset.outlineWidth}px ${preset.outlineColor}` : undefined,
          paintOrder: 'stroke fill',
          textShadow: preset.shadow ? '0 4px 10px rgba(0,0,0,0.55)' : undefined,
        }}
      >
        {text}
      </span>
    </div>
  );
}
