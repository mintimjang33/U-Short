import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const { renderShort } = await import('../lib/render.js');

const cases = [
  {
    compositionId: 'FullFocusedLayout',
    title: { line1: '연예인 이슈,', line2: '소속사 공식 입장' },
    captions: [{ text: '한 연예인 소속사가\n오늘 오전 공식 입장문을 발표했습니다', startMs: 0, endMs: 3000 }],
  },
  {
    compositionId: 'ImageDarkLayout',
    title: { line1: '거제도 재난상황,', line2: '현재까지 상황 정리' },
    captions: [{ text: '거제도 지역에 재난 상황이 발생해\n관계 기관이 대응에 나섰습니다', startMs: 0, endMs: 3000 }],
  },
];

for (const { compositionId, title, captions } of cases) {
  const outputLocation = path.join(__dirname, '..', 'output', `test-${compositionId}.mp4`);
  console.log(`렌더링 시작: ${compositionId}`);
  await renderShort({
    compositionId,
    inputProps: {
      title,
      captions,
      captionPresetId: 'existing-preset-pink-rounded',
      backgroundImageUrl: 'https://picsum.photos/1080/1920',
      backgroundColor: '#0a0a0a',
      audioSrc: null,
      durationMs: 3000,
      extraInfo: [{ text: '@테스트채널', x: 24, y: 24 }],
    },
    outputLocation,
  });
  console.log(`완료: ${outputLocation}`);
}
