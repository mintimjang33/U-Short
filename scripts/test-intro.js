import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const { renderShort } = await import('../lib/render.js');

const outputLocation = path.join(__dirname, '..', 'output', 'test-intro.mp4');
console.log('렌더링 시작: InfoLayout + intro');
await renderShort({
  compositionId: 'InfoLayout',
  inputProps: {
    title: { line1: '거제도 재난상황,', line2: '현재까지 상황 정리' },
    captions: [{ text: '거제도 지역에 재난 상황이 발생해\n관계 기관이 대응에 나섰습니다', startMs: 0, endMs: 3000 }],
    captionPresetId: 'existing-preset-bold-white-outline',
    backgroundImageUrl: 'https://picsum.photos/seed/ushort-intro-test/1080/1920',
    backgroundColor: '#0a0a0a',
    audioSrc: null,
    durationMs: 3000,
    extraInfo: [],
    introEnabled: true,
    introTemplateId: 'jeju-best-intro',
    introDisplayOnly: true,
  },
  outputLocation,
});
console.log('완료:', outputLocation);
