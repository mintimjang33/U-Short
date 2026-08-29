import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence } from 'remotion';
import { CutDaeriCaptionText } from '../CutDaeriCaptionText.jsx';

const FPS = 30;

// U-OneShot 컷대리 전용 레이아웃 — 신규 추가 파일, 기존 레이아웃은 건드리지 않음.
// 기존 레이아웃들은 오디오 하나(audioSrc)를 전체 타임라인에 깔고 배경만 장면별로 바꾸는 구조인데,
// 컷대리는 컷(장면)마다 이미지+음성이 각각 따로 있다(각 컷을 별도로 TTS 생성함). 그래서 공용
// audioSrc 대신, captions[i]의 startMs/endMs를 그 컷의 Sequence 구간으로 그대로 쓰고, scenes[i]에
// 이 레이아웃 전용 필드인 audioUrl을 얹어서 컷마다 독립된 <Audio>를 갖게 했다(오디오 합치기 불필요).
//
// captionStyle: U-OneShot 컷대리 4단계(자막 스타일)에서 저장한 독립 조절값 객체
// { lineCount, fontSize, position(0~100%), fontFamily, color, outlineEnabled, outlineWidth, background }.
// position은 화면 세로축 퍼센트(0=맨 위, 100=맨 아래) — 프리셋 묶음이 아니라 CutDaeriCaptionText.jsx가
// 그대로 렌더링한다.
export const CutDaeriLayout = ({ captions = [], scenes = [], captionStyle }) => {
  const position = captionStyle?.position ?? 90;
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
              <AbsoluteFill
                style={{
                  top: `${position}%`,
                  transform: 'translateY(-50%)',
                  height: 'auto',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '0 40px',
                }}
              >
                <CutDaeriCaptionText text={cap.text} style={captionStyle} />
              </AbsoluteFill>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
