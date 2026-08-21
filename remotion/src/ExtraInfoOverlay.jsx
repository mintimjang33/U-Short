import React from 'react';
import { Img, Video } from 'remotion';

// "로고/영상 오버레이" 기능. 기존엔 텍스트 오버레이만 지원했는데, extraInfo 항목에
// type: 'image' | 'video'가 있으면 로고나 짧은 영상 클립을 원하는 위치/크기로 얹을 수 있다.
// type이 없으면(기존 데이터 호환) 지금까지처럼 텍스트로 렌더링한다.
export function ExtraInfoOverlay({ extraInfo = [], fontSize = 28 }) {
  return extraInfo.map((info, i) => {
    if (info.type === 'image' && info.url) {
      return (
        <Img
          key={i}
          src={info.url}
          style={{
            position: 'absolute',
            left: info.x ?? 24,
            top: info.y ?? 24,
            width: info.width ?? 100,
            height: info.height ?? 'auto',
            objectFit: 'contain',
          }}
        />
      );
    }
    if (info.type === 'video' && info.url) {
      return (
        <Video
          key={i}
          src={info.url}
          muted
          style={{
            position: 'absolute',
            left: info.x ?? 24,
            top: info.y ?? 24,
            width: info.width ?? 160,
            height: info.height ?? 'auto',
            objectFit: 'contain',
          }}
        />
      );
    }
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: info.x ?? 24,
          top: info.y ?? 24,
          fontFamily: 'Pretendard, sans-serif',
          fontWeight: 600,
          fontSize,
          color: '#ffffff',
          textShadow: '0 2px 6px rgba(0,0,0,0.6)',
        }}
      >
        {info.text}
      </div>
    );
  });
}
