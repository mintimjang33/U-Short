import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CaptionText } from '../CaptionText.jsx';
import { useCurrentCaption, useNowMs } from '../useCurrentCaption.js';

const INTRO_MS = 2000;

export const InfoLayout = ({
  title = {},
  captions = [],
  captionPresetId,
  backgroundImageUrl,
  backgroundColor = '#0a0a0a',
  audioSrc,
  extraInfo = [],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = useNowMs();
  const currentCaption = useCurrentCaption(captions);

  const zoom = interpolate(frame, [0, fps * 20], [1, 1.12], { extrapolateRight: 'clamp' });
  const introOpacity = interpolate(nowMs, [0, 300, INTRO_MS - 400, INTRO_MS], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {audioSrc ? <Audio src={audioSrc} /> : null}

      {/* 상단: 이미지/영상 영역 (62%) */}
      <AbsoluteFill style={{ height: '62%', overflow: 'hidden', backgroundColor }}>
        {backgroundImageUrl ? (
          <Img
            src={backgroundImageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${zoom})`,
            }}
          />
        ) : null}

        {(title.line1 || title.line2) && (
          <AbsoluteFill
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              opacity: introOpacity,
              padding: '0 60px',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.35))',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              {title.line1 && (
                <div style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 64, color: '#fff', lineHeight: 1.25 }}>
                  {title.line1}
                </div>
              )}
              {title.line2 && (
                <div style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 64, color: '#fff', lineHeight: 1.25 }}>
                  {title.line2}
                </div>
              )}
            </div>
          </AbsoluteFill>
        )}

        {extraInfo.map((info, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: info.x ?? 24,
              top: info.y ?? 24,
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 600,
              fontSize: 28,
              color: '#ffffff',
              textShadow: '0 2px 6px rgba(0,0,0,0.6)',
            }}
          >
            {info.text}
          </div>
        ))}
      </AbsoluteFill>

      {/* 하단: 검은 자막바 (38%) */}
      <AbsoluteFill
        style={{
          top: '62%',
          height: '38%',
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 40px',
        }}
      >
        <CaptionText text={currentCaption?.text} presetId={captionPresetId} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
