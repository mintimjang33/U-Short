import React from 'react';
import { AbsoluteFill, Img } from 'remotion';

// 인스타툰 1컷용 정지 프레임(1장짜리 스틸 렌더). 배경 이미지 위에 실제 폰트로 렌더링된
// 말풍선 텍스트를 얹는다 — AI 이미지 생성이 한글을 그림처럼 그리다 깨뜨리는 문제를
// 우회하기 위해, 텍스트는 항상 이 컴포넌트가 별도 레이어로 정확하게 렌더링한다.
export const InstatoonPanel = ({ backgroundImageUrl, text = '' }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#111318' }}>
      {backgroundImageUrl ? (
        <Img src={backgroundImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <AbsoluteFill style={{ backgroundColor: '#2a2d36' }} />
      )}

      {text && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 70 }}>
          <div
            style={{
              maxWidth: '82%',
              background: '#ffffff',
              borderRadius: 28,
              border: '5px solid #111318',
              padding: '24px 36px',
              fontFamily: '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
              fontWeight: 800,
              fontSize: 46,
              lineHeight: 1.3,
              color: '#111318',
              textAlign: 'center',
              boxShadow: '0 10px 24px rgba(0,0,0,0.25)',
            }}
          >
            {text}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
