import React from 'react';
import { Composition } from 'remotion';
import { InfoLayout } from './layouts/InfoLayout.jsx';
import { CardLayout } from './layouts/CardLayout.jsx';
import { FullFocusedLayout } from './layouts/FullFocusedLayout.jsx';
import { ImageDarkLayout } from './layouts/ImageDarkLayout.jsx';
import { ViralMintLayout } from './layouts/ViralMintLayout.jsx';
import { DEFAULT_CAPTION_PRESET_ID } from './captionPresets.js';
import { DEFAULT_CAPTION_ANIMATION_ID } from './captionAnimations.js';
import { DEFAULT_INTRO_PRESET_ID } from './introPresets.js';
import { withIntro, INTRO_DURATION_MS } from './withIntro.jsx';

export const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;
const FALLBACK_DURATION_FRAMES = 150; // 5초 — 실제 길이는 durationMs로 덮어씀

export const defaultCompositionProps = {
  title: { line1: '제목 첫번째줄', line2: '제목 두번째 줄' },
  captions: [],
  captionPresetId: DEFAULT_CAPTION_PRESET_ID,
  captionAnimationId: DEFAULT_CAPTION_ANIMATION_ID,
  backgroundImageUrl: null,
  backgroundVideoUrl: null,
  backgroundColor: '#0a0a0a',
  audioSrc: null,
  durationMs: 5000,
  extraInfo: [],
  // 상세편집: 자막 청크(장면) 인덱스별 { imageUrl, videoUrl, captionPresetId } 오버라이드.
  // 없는 인덱스는 프로젝트 전체 배경/자막 프리셋을 그대로 쓴다.
  scenes: [],
  introEnabled: false,
  introTemplateId: DEFAULT_INTRO_PRESET_ID,
  introDisplayOnly: true,
};

const calculateMetadata = ({ props }) => {
  const durationMs = props.durationMs && props.durationMs > 0 ? props.durationMs : 5000;
  const introMs = props.introEnabled ? INTRO_DURATION_MS : 0;
  return {
    durationInFrames: Math.max(1, Math.ceil(((durationMs + introMs) / 1000) * FPS)),
  };
};

const LAYOUTS = [
  ['InfoLayout', InfoLayout],
  ['CardLayout', CardLayout],
  ['FullFocusedLayout', FullFocusedLayout],
  ['ImageDarkLayout', ImageDarkLayout],
  ['ViralMintLayout', ViralMintLayout],
];

export const RemotionRoot = () => {
  return (
    <>
      {LAYOUTS.map(([id, Component]) => (
        <Composition
          key={id}
          id={id}
          component={withIntro(Component)}
          width={WIDTH}
          height={HEIGHT}
          fps={FPS}
          durationInFrames={FALLBACK_DURATION_FRAMES}
          defaultProps={defaultCompositionProps}
          calculateMetadata={calculateMetadata}
        />
      ))}
    </>
  );
};
