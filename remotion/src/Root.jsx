import React from 'react';
import { Composition } from 'remotion';
import { InfoLayout } from './layouts/InfoLayout.jsx';
import { CardLayout } from './layouts/CardLayout.jsx';
import { FullFocusedLayout } from './layouts/FullFocusedLayout.jsx';
import { ImageDarkLayout } from './layouts/ImageDarkLayout.jsx';
import { ViralMintLayout } from './layouts/ViralMintLayout.jsx';
import { CutDaeriLayout } from './layouts/CutDaeriLayout.jsx';
import { InstatoonPanel } from './layouts/InstatoonPanel.jsx';
import { CardNewsPanel } from './layouts/CardNewsPanel.jsx';
import { VideoEditLayout } from './layouts/VideoEditLayout.jsx';
import { DEFAULT_CAPTION_PRESET_ID } from './captionPresets.js';
import { DEFAULT_CAPTION_ANIMATION_ID } from './captionAnimations.js';
import { DEFAULT_TITLE_PRESET_ID } from './titlePresets.js';
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
  captionStyle: null,
  captionAnimationId: DEFAULT_CAPTION_ANIMATION_ID,
  titlePresetId: DEFAULT_TITLE_PRESET_ID,
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
  ['CutDaeriLayout', CutDaeriLayout],
  ['VideoEditLayout', VideoEditLayout],
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
      {/* U-OneShot 컷대리는 16:9도 지원해야 해서, 기존 LAYOUTS 루프(전부 1080x1920 고정)와
          별개로 가로 버전 하나만 추가로 등록한다. 다른 레이아웃엔 영향 없음. */}
      {/* 인스타툰 1컷 정지 프레임. 비디오가 아니라 단일 스틸 이미지라 durationInFrames=1,
          withIntro/calculateMetadata 등 캡션-비디오 전용 로직은 적용하지 않는다. */}
      <Composition
        id="InstatoonPanel"
        component={InstatoonPanel}
        width={1080}
        height={1080}
        fps={FPS}
        durationInFrames={1}
        defaultProps={{ backgroundImageUrl: null, text: '' }}
      />
      {/* 카드뉴스 1장 정지 프레임. InstatoonPanel과 같은 이유로 durationInFrames=1, withIntro 미적용. */}
      <Composition
        id="CardNewsPanel"
        component={CardNewsPanel}
        width={1080}
        height={1080}
        fps={FPS}
        durationInFrames={1}
        defaultProps={{ backgroundImageUrl: null, title: '', text: '', type: 'body' }}
      />
      <Composition
        id="CutDaeriLayoutHorizontal"
        component={withIntro(CutDaeriLayout)}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FALLBACK_DURATION_FRAMES}
        defaultProps={defaultCompositionProps}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
