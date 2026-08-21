import React from 'react';
import { AbsoluteFill, Audio, Img, Video, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CaptionText } from '../CaptionText.jsx';
import { ExtraInfoOverlay } from '../ExtraInfoOverlay.jsx';
import { TitleBlock } from '../TitleBlock.jsx';
import { useCurrentCaption, useCurrentSceneIndex, useNowMs } from '../useCurrentCaption.js';

const INTRO_MS = 2000;

export const InfoLayout = ({
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
  // 상세편집(장면별 미디어/자막 스타일)에서 자막 청크별로 지정한 값이 있으면 그걸 우선 쓰고,
  // 없으면 프로젝트 전체 배경/자막 프리셋으로 자연스럽게 폴백한다.
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
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {audioSrc ? <Audio src={audioSrc} /> : null}

      {/* 상단: 이미지/영상 영역 (62%) */}
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
            <TitleBlock line1={title.line1} line2={title.line2} presetId={titlePresetId} fontSize={64} />
          </AbsoluteFill>
        )}

        <ExtraInfoOverlay extraInfo={extraInfo} fontSize={28} />
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
        <CaptionText text={currentCaption?.text} presetId={effectiveCaptionPresetId} animationId={effectiveCaptionAnimationId} startMs={currentCaption?.startMs} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
