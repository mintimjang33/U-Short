import Anthropic from '@anthropic-ai/sdk';

/**
 * 완성된 내레이션을 6~8초 단위 "장면"으로 쪼개서, 장면별 AI 영상 생성용 영어 프롬프트를 만든다.
 *
 * "신비한 건축사전" 등 벤치마킹 채널 튜토리얼 분석 결과(대본을 8초 단위 여러 장면으로 나누고,
 * 각 장면에 카메라 워크 1개 + 피사체/분위기를 지정한 프롬프트를 만들어 AI 영상 생성 모델에
 * 순서대로 태우는 방식)를 그대로 반영했다.
 *
 * @param {object} params
 * @param {string} params.narration - 전체 내레이션
 * @param {number} params.durationMs - 전체 음성 길이(ms) — buildCaptions와 같은 값을 써서 장면 타이밍이 자막과 어긋나지 않게 한다.
 * @param {number} [params.sceneDurationSec] - 장면당 목표 길이(초), 기본 7
 * @returns {Promise<Array<{startMs:number,endMs:number,prompt:string}>>}
 */
export async function planScenes({ narration, durationMs, sceneDurationSec = 7 }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다.');
  }
  if (!narration || !durationMs) {
    throw new Error('planScenes: narration과 durationMs가 모두 필요합니다.');
  }

  const sceneCount = Math.max(1, Math.round(durationMs / 1000 / sceneDurationSec));
  const sceneMs = durationMs / sceneCount;

  const system = [
    '너는 9:16 세로 쇼츠용 AI 영상 생성 프롬프트 작가다.',
    `아래 내레이션 전체를 정확히 ${sceneCount}개의 연속된 장면으로 나눠서, 각 장면마다 AI 영상 생성 모델에 줄 영어 프롬프트를 만든다.`,
    '각 프롬프트는 카메라 워크(slow zoom-in / lateral tracking shot / drone shot 등) 1개, 피사체·배경 묘사, 분위기(조명·색감)를 포함한 한두 문장으로 작성한다.',
    '장면은 내레이션 흐름 순서와 맞아떨어져야 한다 — 특정 대상/사건을 말하는 구간엔 그 장면을 그려야 한다.',
    '연속된 장면끼리 카메라 워크가 반복되지 않도록 다양화한다.',
    '실제 사람 얼굴이나 특정 실존 인물을 지정하지 말고, 풍경·건축물·사물 등 비인물 비주얼 위주로 작성한다.',
    `반드시 아래 JSON 배열만 출력한다 (정확히 ${sceneCount}개 원소, 다른 설명·코드펜스 금지):`,
    '[{"prompt": "..."}]',
  ].join('\n');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    system,
    messages: [{ role: 'user', content: narration }],
  });

  const rawText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  const cleaned = rawText.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`planScenes: 응답을 JSON으로 파싱하지 못했습니다: ${err.message}\n원본: ${rawText.slice(0, 300)}`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`planScenes: 장면 배열이 비어있습니다: ${JSON.stringify(parsed).slice(0, 300)}`);
  }

  return parsed.map((scene, i) => ({
    startMs: Math.round(i * sceneMs),
    endMs: Math.round(Math.min((i + 1) * sceneMs, durationMs)),
    prompt: String(scene.prompt || '').trim(),
  }));
}
