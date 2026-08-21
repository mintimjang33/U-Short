import React from 'react';
import { AbsoluteFill, Audio, Img, Video, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CaptionText } from '../CaptionText.jsx';
import { useCurrentCaption, useCurrentSceneIndex, useNowMs } from '../useCurrentCaption.js';

const INTRO_MS = 1800;

export const CardLayout = ({
  title = {},
  captions = [],
  captionPresetId,
  backgroundImageUrl,
  backgroundVideoUrl,
  backgroundColor = '#111318',
  audioSrc,
  extraInfo = [],
  scenes = [],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = useNowMs();
  const currentCaption = useCurrentCaption(captions);
  const sceneIndex = useCurrentSceneIndex(captions);
  const activeScene = scenes[sceneIndex] || null;
  const effectiveImageUrl = activeScene?.imageUrl || backgroundImageUrl;
  const effectiveVideoUrl = activeScene?.videoUrl || backgroundVideoUrl;
  const effectiveCaptionPresetId = activeScene?.captionPresetId || captionPresetId;

  const zoom = interpolate(frame, [0, fps * 20], [1.04, 1.16], { extrapolateRight: 'clamp' });
  const introOpacity = interpolate(nowMs, [0, 300, INTRO_MS - 300, INTRO_MS], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {audioSrc ? <Audio src={audioSrc} /> : null}

      {/* 카드형: 여백을 두고 둥근 모서리 사진 카드 + 사진 위에 그라디언트+캡션 */}
      <AbsoluteFill style={{ padding: 48 }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 40,
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
          }}
        >
          {effectiveVideoUrl ? (
            <Video
              src={effectiveVideoUrl}
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }}
            />
          ) : effectiveImageUrl ? (
            <Img
              src={effectiveImageUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${zoom})`,
              }}
            />
          ) : (
            <AbsoluteFill style={{ backgroundColor: '#2a2d36' }} />
          )}

          <AbsoluteFill
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.85) 100%)',
            }}
          />

          {(title.line1 || title.line2) && (
            <AbsoluteFill
              style={{
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: 90,
                opacity: introOpacity,
              }}
            >
              <div style={{ textAlign: 'center', padding: '0 50px' }}>
                {title.line1 && (
                  <div style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 58, color: '#fff', lineHeight: 1.25 }}>
                    {title.line1}
                  </div>
                )}
                {title.line2 && (
                  <div style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 58, color: '#fff', lineHeight: 1.25 }}>
                    {title.line2}
                  </div>
                )}
              </div>
            </AbsoluteFill>
          )}

          <AbsoluteFill
            style={{
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingBottom: 80,
              padding: '0 40px 80px',
            }}
          >
            <CaptionText text={currentCaption?.text} presetId={effectiveCaptionPresetId} />
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
                fontSize: 26,
                color: '#ffffff',
                textShadow: '0 2px 6px rgba(0,0,0,0.6)',
              }}
            >
              {info.text}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
