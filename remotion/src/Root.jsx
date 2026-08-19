import React from 'react';
import { Composition } from 'remotion';
import { InfoLayout } from './layouts/InfoLayout.jsx';
import { CardLayout } from './layouts/CardLayout.jsx';
import { DEFAULT_CAPTION_PRESET_ID } from './captionPresets.js';

export const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;
const FALLBACK_DURATION_FRAMES = 150; // 5초 — 실제 길이는 durationMs로 덮어씀

export const defaultCompositionProps = {
  title: { line1: '제목 첫번째줄', line2: '제목 두번째 줄' },
  captions: [],
  captionPresetId: DEFAULT_CAPTION_PRESET_ID,
  backgroundImageUrl: null,
  backgroundColor: '#0a0a0a',
  audioSrc: null,
  durationMs: 5000,
  extraInfo: [],
};

const calculateMetadata = ({ props }) => {
  const durationMs = props.durationMs && props.durationMs > 0 ? props.durationMs : 5000;
  return {
    durationInFrames: Math.max(1, Math.ceil((durationMs / 1000) * FPS)),
  };
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="InfoLayout"
        component={InfoLayout}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={FALLBACK_DURATION_FRAMES}
        defaultProps={defaultCompositionProps}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="CardLayout"
        component={CardLayout}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={FALLBACK_DURATION_FRAMES}
        defaultProps={defaultCompositionProps}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
