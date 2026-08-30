import React from 'react';
import { AbsoluteFill, Img } from 'remotion';

const ACCENT = { cover: '#facc15', body: '#60a5fa', summary: '#34d399' };
const BADGE_LABEL = { cover: 'COVER', body: null, summary: '요약' };

// 카드뉴스 1장용 정지 프레임(1080x1080). 인스타툰(말풍선)과 달리 정보 전달 포맷이라
// 화면 하단에 그라디언트 위 텍스트 블록을 얹는 전형적인 카드뉴스 레이아웃을 쓴다.
// AI 이미지 생성이 한글을 그림처럼 그리다 깨뜨리는 문제를 피하려고, 텍스트는 항상
// 이 컴포넌트가 실제 폰트로 별도 렌더링한다(instatoonPanel과 같은 이유).
export const CardNewsPanel = ({ backgroundImageUrl, title = '', text = '', type = 'body' }) => {
  const accent = ACCENT[type] || ACCENT.body;
  const badge = BADGE_LABEL[type];
  const isCover = type === 'cover';

  return (
    <AbsoluteFill style={{ backgroundColor: '#111318', fontFamily: '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif' }}>
      {backgroundImageUrl ? (
        <Img src={backgroundImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <AbsoluteFill style={{ backgroundColor: '#2a2d36' }} />
      )}

      {/* 가독성용 하단 그라디언트 */}
      <AbsoluteFill
        style={{
          background: isCover
            ? 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.75) 75%, rgba(0,0,0,0.9) 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.82) 78%, rgba(0,0,0,0.92) 100%)',
        }}
      />

      {badge && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 40,
            background: accent,
            color: '#111318',
            fontWeight: 800,
            fontSize: 26,
            padding: '8px 20px',
            borderRadius: 999,
            letterSpacing: 1,
          }}
        >
          {badge}
        </div>
      )}

      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: isCover ? 'center' : 'flex-start',
          padding: isCover ? '0 70px 110px' : '0 60px 90px',
        }}
      >
        {title && (
          <div
            style={{
              fontWeight: 900,
              fontSize: isCover ? 76 : 44,
              lineHeight: 1.25,
              color: '#ffffff',
              textAlign: isCover ? 'center' : 'left',
              textShadow: '0 4px 16px rgba(0,0,0,0.5)',
              marginBottom: 18,
            }}
          >
            {!isCover && <span style={{ color: accent }}>▎</span>} {title}
          </div>
        )}
        {text && (
          <div
            style={{
              fontWeight: 500,
              fontSize: isCover ? 34 : 32,
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.92)',
              textAlign: isCover ? 'center' : 'left',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          >
            {text}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
