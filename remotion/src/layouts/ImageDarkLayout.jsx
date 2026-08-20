import React from 'react';
import { AbsoluteFill, Audio, Img, Video, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CaptionText } from '../CaptionText.jsx';
import { useCurrentCaption, useNowMs } from '../useCurrentCaption.js';

const INTRO_MS = 2000;

// 정보성 다크: InfoLayout과 같은 상단이미지/하단자막 2분할 구조지만, 하단이 검정 단색이 아니라
// 이미지에서 이어지는 짙은 그라디언트 + 반투명 다크 패널로 처리되는 "다크 테마" 버전.
export const ImageDarkLayout = ({
  title = {},
  captions = [],
  captionPresetId,
  backgroundImageUrl,
  backgroundVideoUrl,
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
    <AbsoluteFill style={{ backgroundColor: '#050507' }}>
      {audioSrc ? <Audio src={audioSrc} /> : null}

      <AbsoluteFill style={{ height: '62%', overflow: 'hidden', backgroundColor }}>
        {backgroundVideoUrl ? (
          <Video
            src={backgroundVideoUrl}
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }}
          />
        ) : backgroundImageUrl ? (
          <Img
            src={backgroundImageUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }}
          />
        ) : null}
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 30%, rgba(5,5,7,0) 70%, #050507 100%)' }} />

        {(title.line1 || title.line2) && (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: introOpacity, padding: '0 60px' }}>
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

      <AbsoluteFill
        style={{
          top: '62%',
          height: '38%',
          background: 'linear-gradient(180deg, #0b0b10 0%, #050507 100%)',
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
