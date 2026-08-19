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
