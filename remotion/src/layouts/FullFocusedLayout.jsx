import React from 'react';
import { AbsoluteFill, Audio, Img, Video, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CaptionText } from '../CaptionText.jsx';
import { useCurrentCaption, useNowMs } from '../useCurrentCaption.js';

const INTRO_MS = 2000;

// 풀레이아웃: 이미지가 화면 전체를 채우고, 자막은 하단에 떠있는 형태로 얹힌다.
// InfoLayout(정보 레이아웃)과 달리 하단에 별도 검은 자막바 영역을 나누지 않는다.
export const FullFocusedLayout = ({
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

  const zoom = interpolate(frame, [0, fps * 20], [1, 1.1], { extrapolateRight: 'clamp' });
  const introOpacity = interpolate(nowMs, [0, 300, INTRO_MS - 400, INTRO_MS], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {audioSrc ? <Audio src={audioSrc} /> : null}

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

      <AbsoluteFill
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.75) 100%)' }}
      />

      {(title.line1 || title.line2) && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 90, opacity: introOpacity }}>
          <div style={{ textAlign: 'center', padding: '0 56px' }}>
            {title.line1 && (
              <div style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 60, color: '#fff', lineHeight: 1.25 }}>
                {title.line1}
              </div>
            )}
            {title.line2 && (
              <div style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 60, color: '#fff', lineHeight: 1.25 }}>
                {title.line2}
              </div>
            )}
          </div>
        </AbsoluteFill>
      )}

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', padding: '0 40px 90px' }}>
        <CaptionText text={currentCaption?.text} presetId={captionPresetId} />
      </AbsoluteFill>

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
  );
};
