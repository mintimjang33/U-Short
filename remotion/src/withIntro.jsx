import React from 'react';
import { Sequence, useVideoConfig } from 'remotion';
import { IntroBoard } from './IntroBoard.jsx';

export const INTRO_DURATION_MS = 1800;

/**
 * 레이아웃 컴포넌트를 감싸서, introEnabled가 true면 앞에 IntroBoard를 붙인다.
 * Remotion Sequence를 쓰면 뒤에 오는 LayoutComponent는 자기 내부 프레임 카운트가
 * 0부터 다시 시작하므로(상대 시간), 레이아웃 코드 자체는 인트로 유무를 몰라도 된다.
 * introDisplayOnly가 true(기본)면 본문 레이아웃 자체의 제목 오버레이는 생략한다
 * (인트로에서 이미 제목을 보여줬으니 중복 방지).
 */
export function withIntro(LayoutComponent) {
  function WithIntro(props) {
    const { fps } = useVideoConfig();
    const { introEnabled, introTemplateId, introDisplayOnly = true, title } = props;

    if (!introEnabled) {
      return <LayoutComponent {...props} />;
    }

    const introFrames = Math.round((INTRO_DURATION_MS / 1000) * fps);
    const mainTitle = introDisplayOnly ? {} : title;

    return (
      <>
        <Sequence from={0} durationInFrames={introFrames} name="intro">
          <IntroBoard title={title} presetId={introTemplateId} />
        </Sequence>
        <Sequence from={introFrames} name="main">
          <LayoutComponent {...props} title={mainTitle} />
        </Sequence>
      </>
    );
  }
  WithIntro.displayName = `withIntro(${LayoutComponent.displayName || LayoutComponent.name || 'Layout'})`;
  return WithIntro;
}
