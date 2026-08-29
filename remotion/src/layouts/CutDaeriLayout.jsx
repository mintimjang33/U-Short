import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence } from 'remotion';
import { CaptionText } from '../CaptionText.jsx';

const FPS = 30;

// U-OneShot 컷대리 전용 레이아웃 — 신규 추가 파일, 기존 레이아웃은 건드리지 않음.
// 기존 레이아웃들은 오디오 하나(audioSrc)를 전체 타임라인에 깔고 배경만 장면별로 바꾸는 구조인데,
// 컷대리는 컷(장면)마다 이미지+음성이 각각 따로 있다(각 컷을 별도로 TTS 생성함). 그래서 공용
// audioSrc 대신, captions[i]의 startMs/endMs를 그 컷의 Sequence 구간으로 그대로 쓰고, scenes[i]에
// 이 레이아웃 전용 필드인 audioUrl을 얹어서 컷마다 독립된 <Audio>를 갖게 했다(오디오 합치기 불필요).
// captionPosition: U-OneShot 컷대리 4단계(자막 스타일)에서 고르는 자막 세로 위치. 'top'/'middle'/
// 'bottom'(기본) 3종 — 원본 실측 스펙의 "위치" 옵션에 대응.
const POSITION_STYLES = {
  top: { justifyContent: 'flex-start', padding: '100px 40px 0' },
  middle: { justifyContent: 'center', padding: '0 40px' },
  bottom: { justifyContent: 'flex-end', padding: '0 40px 100px' },
};

export const CutDaeriLayout = ({ captions = [], scenes = [], captionPresetId, captionPosition = 'bottom', captionOverride }) => {
  const positionStyle = POSITION_STYLES[captionPosition] || POSITION_STYLES.bottom;
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {captions.map((cap, i) => {
        const scene = scenes[i] || {};
        const from = Math.round((cap.startMs / 1000) * FPS);
        const durationInFrames = Math.max(1, Math.round(((cap.endMs - cap.startMs) / 1000) * FPS));
        return (
          <Sequence key={i} from={from} durationInFrames={durationInFrames}>
            <AbsoluteFill>
              {scene.imageUrl && (
                <Img src={scene.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              {scene.audioUrl && <Audio src={scene.audioUrl} />}
              <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 100%)' }} />
              <AbsoluteFill style={{ alignItems: 'center', ...positionStyle }}>
                <CaptionText text={cap.text} presetId={captionPresetId} override={captionOverride} startMs={0} />
              </AbsoluteFill>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
