import React from 'react';
import { AbsoluteFill, Video, interpolate, useCurrentFrame } from 'remotion';
import { CaptionText } from '../CaptionText.jsx';
import { ExtraInfoOverlay } from '../ExtraInfoOverlay.jsx';
import { TitleBlock } from '../TitleBlock.jsx';
import { useCurrentCaption } from '../useCurrentCaption.js';

// 숏폼/롱폼 편집: 사용자가 직접 찍은 영상을 그대로 쓰고, 그 영상의 실제 음성을 Whisper로
// 받아쓴 자막을 얹는다. 다른 레이아웃과 달리 별도 TTS(audioSrc)를 안 쓰고 영상 자체의
// 오디오 트랙을 그대로 재생한다(muted 안 함) — ViralMintLayout(TTS 보이스오버용)과의 핵심 차이.
export const VideoEditLayout = ({
  title = {},
  captions = [],
  captionPresetId,
  titlePresetId,
  backgroundVideoUrl,
  backgroundColor = '#0a0a0a',
  extraInfo = [],
}) => {
  const frame = useCurrentFrame();
  const currentCaption = useCurrentCaption(captions);
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {backgroundVideoUrl ? (
        <Video src={backgroundVideoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b6b85',
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 20,
            textAlign: 'center',
            padding: 40,
          }}
        >
          편집할 영상을 업로드하면 이 자리에 재생됩니다
        </AbsoluteFill>
      )}

      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.7) 100%)' }} />

      {(title.line1 || title.line2) && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 80, opacity: titleOpacity }}>
          <div style={{ textAlign: 'center', padding: '10px 24px', borderRadius: 9999, background: 'rgba(0,0,0,0.45)' }}>
            <TitleBlock line1={title.line1} line2={title.line2} presetId={titlePresetId} fontSize={40} />
          </div>
        </AbsoluteFill>
      )}

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', padding: '0 40px 90px' }}>
        <CaptionText text={currentCaption?.text} presetId={captionPresetId} />
      </AbsoluteFill>

      <ExtraInfoOverlay extraInfo={extraInfo} fontSize={26} />
    </AbsoluteFill>
  );
};
