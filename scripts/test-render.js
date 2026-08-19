import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { renderShort } from '../lib/render.js';

function makeSilentWav(filePath, seconds) {
  const sampleRate = 44100;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  // 나머지는 이미 0으로 채워져 있음 = 무음

  fs.writeFileSync(filePath, buffer);
}

// 실제 파이프라인은 TTS 음성을 Supabase Storage에 올려 http(s) URL로 Remotion에 넘긴다.
// 여기서는 Supabase 없이도 같은 "오디오 = URL" 경로를 그대로 검증하기 위해
// 로컬에 잠깐 정적 파일 서버를 띄워 더미 wav를 서빙한다.
function serveDir(dir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(dir, decodeURIComponent(req.url));
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        res.writeHead(200);
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const outDir = path.resolve('output/test');
  fs.mkdirSync(outDir, { recursive: true });

  const audioPath = path.join(outDir, 'silence.wav');
  makeSilentWav(audioPath, 4);

  const server = await serveDir(outDir);
  const { port } = server.address();
  const audioUrl = `http://127.0.0.1:${port}/silence.wav`;
  console.log('더미 오디오 서빙 중:', audioUrl);

  const captions = [
    { text: '슈퍼쇼츠 클론 렌더링 테스트', startMs: 0, endMs: 1500 },
    { text: 'Remotion 파이프라인이 실제로 동작하는지 확인 중', startMs: 1500, endMs: 3200 },
    { text: '음성 트랙과 자막 싱크까지 확인합니다', startMs: 3200, endMs: 4000 },
  ];

  const baseProps = {
    title: { line1: '렌더링 테스트', line2: '더미 데이터' },
    captions,
    captionPresetId: 'existing-preset-bold-white-outline',
    backgroundImageUrl: null,
    backgroundColor: '#14213d',
    audioSrc: audioUrl,
    durationMs: 4000,
    extraInfo: [{ text: '@supershorts-clone', x: 24, y: 24 }],
  };

  try {
    for (const compositionId of ['InfoLayout', 'CardLayout']) {
      const outputLocation = path.join(outDir, `${compositionId}.mp4`);
      console.log(`\n렌더링 시작: ${compositionId} → ${outputLocation}`);
      const start = Date.now();
      await renderShort({
        compositionId,
        inputProps: {
          ...baseProps,
          captionPresetId: compositionId === 'CardLayout' ? 'existing-preset-punch-outline' : baseProps.captionPresetId,
        },
        outputLocation,
      });
      const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
      const stat = fs.statSync(outputLocation);
      console.log(`완료 (${elapsedSec}s) — 파일 크기: ${(stat.size / 1024).toFixed(1)}KB`);
      if (stat.size < 1000) {
        throw new Error(`${compositionId} 렌더 결과 파일이 비정상적으로 작습니다.`);
      }
    }
    console.log('\n모든 렌더 테스트 통과');
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error('렌더 테스트 실패:', err);
  process.exit(1);
});
