import React from 'react';
import { AbsoluteFill, Audio, Img, Video, interpolate, useCurrentFrame } from 'remotion';
import { CaptionText } from '../CaptionText.jsx';
import { ExtraInfoOverlay } from '../ExtraInfoOverlay.jsx';
import { useCurrentCaption } from '../useCurrentCaption.js';

// 바이럴민트: 실제 인물이 말하는 영상을 배경으로 쓰는 레이아웃.
// 이 파이프라인은 인물 영상을 자동 생성하지 않으므로, 사용자가 직접 업로드한
// backgroundVideoUrl을 그대로 배경으로 재생한다(없으면 backgroundImageUrl로 대체).
// 오디오는 항상 TTS(audioSrc)를 쓰고, 배경 영상 자체의 소리는 죽인다(muted).
export const ViralMintLayout = ({
  title = {},
  captions = [],
  captionPresetId,
  backgroundVideoUrl,
  backgroundImageUrl,
  backgroundColor = '#0a0a0a',
  audioSrc,
  extraInfo = [],
}) => {
  const frame = useCurrentFrame();
  const currentCaption = useCurrentCaption(captions);
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {audioSrc ? <Audio src={audioSrc} /> : null}

      {backgroundVideoUrl ? (
        <Video src={backgroundVideoUrl} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : backgroundImageUrl ? (
        <Img src={backgroundImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          인물 영상을 업로드하면 이 자리에 재생됩니다
        </AbsoluteFill>
      )}

      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.7) 100%)' }} />

      {(title.line1 || title.line2) && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 80, opacity: titleOpacity }}>
          <div
            style={{
              textAlign: 'center',
              padding: '10px 24px',
              borderRadius: 9999,
              background: 'rgba(0,0,0,0.45)',
            }}
          >
            {title.line1 && (
              <div style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 40, color: '#fff', lineHeight: 1.3 }}>
                {title.line1}
              </div>
            )}
            {title.line2 && (
              <div style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 40, color: '#fff', lineHeight: 1.3 }}>
                {title.line2}
              </div>
            )}
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
