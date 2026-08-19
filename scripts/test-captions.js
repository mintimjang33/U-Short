import assert from 'node:assert/strict';
import { buildCaptions } from '../lib/buildCaptions.js';

function makeAlignmentFixture(text) {
  // 문자 하나당 80ms로 가정한 가짜 alignment (ElevenLabs 응답 형태 모사)
  const characters = text.split('');
  const character_start_times_seconds = [];
  const character_end_times_seconds = [];
  let t = 0;
  for (let i = 0; i < characters.length; i++) {
    character_start_times_seconds.push(t);
    t += 0.08;
    character_end_times_seconds.push(t);
  }
  return { characters, character_start_times_seconds, character_end_times_seconds };
}

// 1) alignment 있는 경우 (ElevenLabs 경로)
{
  const narration = '오늘은 여수 맛집 순이네밥상 후기를 가져왔어요 웨이팅 팁까지 알려드릴게요';
  const alignment = makeAlignmentFixture(narration);
  const captions = buildCaptions({ narration, alignment, wordsPerChunk: 3 });

  assert.ok(captions.length > 0, '자막 큐가 비어있으면 안 됨');
  for (let i = 0; i < captions.length; i++) {
    const c = captions[i];
    assert.ok(c.startMs < c.endMs, `caption[${i}] start < end 이어야 함`);
    if (i > 0) {
      assert.ok(c.startMs >= captions[i - 1].startMs, `caption[${i}] 시작시간이 이전보다 뒤여야 함`);
    }
  }
  const rebuilt = captions.map((c) => c.text).join(' ');
  assert.equal(
    rebuilt.replace(/\s+/g, ''),
    narration.replace(/\s+/g, ''),
    'alignment 경로: 자막을 다 이어붙이면 원문과 같아야 함'
  );
  console.log('[PASS] alignment 기반 자막 생성 —', captions.length, '개 큐');
  console.log(captions.slice(0, 3));
}

// 2) alignment 없는 경우 (Clova 경로, 균등분배)
{
  const narration = '오늘은 여수 맛집 순이네밥상 후기를 가져왔어요 웨이팅 팁까지 알려드릴게요';
  const durationMs = 6000;
  const captions = buildCaptions({ narration, alignment: null, durationMs, wordsPerChunk: 3 });

  assert.ok(captions.length > 0);
  assert.equal(captions[0].startMs, 0, '첫 캡션은 0ms에서 시작해야 함');
  assert.ok(
    captions[captions.length - 1].endMs <= durationMs + 1,
    '마지막 캡션 종료시간이 전체 길이를 넘으면 안 됨'
  );
  for (let i = 1; i < captions.length; i++) {
    assert.ok(captions[i].startMs >= captions[i - 1].endMs - 1, '캡션끼리 겹치면 안 됨');
  }
  console.log('[PASS] 균등분배 기반 자막 생성 —', captions.length, '개 큐, 총', durationMs, 'ms');
  console.log(captions);
}

// 3) words 기반 (Whisper 경로)
{
  const narration = '오늘은 여수 맛집 순이네밥상 후기를 가져왔어요';
  const words = [
    { text: '오늘은', startMs: 0, endMs: 300 },
    { text: '여수', startMs: 300, endMs: 600 },
    { text: '맛집', startMs: 600, endMs: 900 },
    { text: '순이네밥상', startMs: 900, endMs: 1400 },
    { text: '후기를', startMs: 1400, endMs: 1700 },
    { text: '가져왔어요', startMs: 1700, endMs: 2200 },
  ];
  const captions = buildCaptions({ narration, words, wordsPerChunk: 3 });

  assert.equal(captions.length, 2, 'words 6개를 3개씩 묶으면 큐 2개여야 함');
  assert.equal(captions[0].startMs, 0);
  assert.equal(captions[0].endMs, 900);
  assert.equal(captions[1].startMs, 900);
  assert.equal(captions[1].endMs, 2200);
  console.log('[PASS] words(Whisper) 기반 자막 생성 —', captions.length, '개 큐');
  console.log(captions);
}

// 4) 에러 케이스
{
  try {
    buildCaptions({ narration: '', alignment: null, durationMs: 1000 });
    throw new Error('빈 narration인데 에러가 안 났음');
  } catch (err) {
    assert.match(err.message, /narration이 비어있습니다/);
    console.log('[PASS] 빈 narration 에러 처리');
  }

  try {
    buildCaptions({ narration: '텍스트', alignment: null, durationMs: null });
    throw new Error('durationMs 없는데 에러가 안 났음');
  } catch (err) {
    assert.match(err.message, /durationMs가 필요합니다/);
    console.log('[PASS] durationMs 누락 에러 처리');
  }
}

console.log('\n모든 테스트 통과');
