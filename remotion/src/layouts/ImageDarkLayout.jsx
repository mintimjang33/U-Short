import React from 'react';
import { AbsoluteFill, Audio, Img, Video, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CaptionText } from '../CaptionText.jsx';
import { ExtraInfoOverlay } from '../ExtraInfoOverlay.jsx';
import { TitleBlock } from '../TitleBlock.jsx';
import { useCurrentCaption, useCurrentSceneIndex, useNowMs } from '../useCurrentCaption.js';

const INTRO_MS = 2000;

// 정보성 다크: InfoLayout과 같은 상단이미지/하단자막 2분할 구조지만, 하단이 검정 단색이 아니라
// 이미지에서 이어지는 짙은 그라디언트 + 반투명 다크 패널로 처리되는 "다크 테마" 버전.
export const ImageDarkLayout = ({
  title = {},
  captions = [],
  captionPresetId,
  captionAnimationId,
  titlePresetId,
  backgroundImageUrl,
  backgroundVideoUrl,
  backgroundColor = '#0a0a0a',
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
  const effectiveCaptionAnimationId = activeScene?.captionAnimationId || captionAnimationId;

  const zoom = interpolate(frame, [0, fps * 20], [1, 1.12], { extrapolateRight: 'clamp' });
  const introOpacity = interpolate(nowMs, [0, 300, INTRO_MS - 400, INTRO_MS], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050507' }}>
      {audioSrc ? <Audio src={audioSrc} /> : null}

      <AbsoluteFill style={{ height: '62%', overflow: 'hidden', backgroundColor }}>
        {effectiveVideoUrl ? (
          <Video
            src={effectiveVideoUrl}
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }}
          />
        ) : effectiveImageUrl ? (
          <Img
            src={effectiveImageUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }}
          />
        ) : null}
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 30%, rgba(5,5,7,0) 70%, #050507 100%)' }} />

        {(title.line1 || title.line2) && (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: introOpacity, padding: '0 60px' }}>
            <TitleBlock line1={title.line1} line2={title.line2} presetId={titlePresetId} fontSize={64} />
          </AbsoluteFill>
        )}

        <ExtraInfoOverlay extraInfo={extraInfo} fontSize={28} />
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
        <CaptionText text={currentCaption?.text} presetId={effectiveCaptionPresetId} animationId={effectiveCaptionAnimationId} startMs={currentCaption?.startMs} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
