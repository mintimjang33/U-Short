import { useCurrentFrame, useVideoConfig } from 'remotion';

export function useNowMs() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (frame / fps) * 1000;
}

export function useCurrentCaption(captions = []) {
  const nowMs = useNowMs();
  return captions.find((c) => nowMs >= c.startMs && nowMs < c.endMs) || null;
}

// 상세편집(장면별 미디어/자막 스타일) 기능이 자막 청크 하나 = 장면 하나로 매핑하기 위해
// 현재 몇 번째 자막 청크가 재생 중인지 인덱스로 알려준다.
export function useCurrentSceneIndex(captions = []) {
  const nowMs = useNowMs();
  return captions.findIndex((c) => nowMs >= c.startMs && nowMs < c.endMs);
}
