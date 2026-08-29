/**
 * 주제(topic)를 인스타툰 N컷 기획으로 쪼갠다. 각 컷은 {text(짧은 캡션/대사), imageDescription(장면 묘사)}.
 * 캡션 텍스트는 이미지 생성 프롬프트에 그대로 반영되어(Nano Banana가 텍스트 렌더링을 잘함) 이미지 안에
 * 말풍선/자막처럼 baked-in된다 — 별도 텍스트 오버레이 레이어를 만들지 않는 v1 설계.
 */
import Anthropic from '@anthropic-ai/sdk';

function buildSystemPrompt(panelCount) {
  return [
    `너는 인스타그램 카드뉴스형 웹툰(인스타툰) 작가다. 주어진 주제로 정확히 ${panelCount}컷의 인스타툰을 기획한다.`,
    '각 컷은 이야기가 자연스럽게 이어지도록 순서대로 구성한다: 도입(첫 컷은 훅이 되는 상황 제시) → 전개 → 마무리(마지막 컷은 결론/공감 포인트).',
    '컷마다 다음 두 가지를 만든다:',
    '1) text: 그 컷에 들어갈 짧은 한국어 대사/캡션(말풍선용, 15자 내외, 구어체)',
    '2) imageDescription: 그 컷의 장면을 영어로 묘사한 이미지 프롬프트. 캐릭터의 표정·자세·배경·상황을 구체적으로 쓰되, 캐릭터 외형 자체(생김새)는 절대 묘사하지 않는다(레퍼런스 이미지가 그 역할을 대신함 — 상황/구도/표정만 묘사).',
    '반드시 아래 JSON 스키마만 출력한다. 다른 설명, 마크다운 코드펜스는 절대 포함하지 않는다.',
    `{"panels": [{"text": string, "imageDescription": string}, ...]} (배열 길이 정확히 ${panelCount})`,
  ].join('\n');
}

/**
 * @param {string} topic - 인스타툰 주제(예: "월요일 출근길 직장인의 마음")
 * @param {number} [panelCount] - 컷 수, 기본 6, 최대 10
 * @returns {Promise<{text: string, imageDescription: string}[]>}
 */
export async function planInstatoon(topic, panelCount = 6) {
  if (!topic || topic.trim().length === 0) {
    throw new Error('planInstatoon: topic이 비어있습니다.');
  }
  const count = Math.min(10, Math.max(2, panelCount));
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다.');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    system: buildSystemPrompt(count),
    messages: [{ role: 'user', content: `주제: ${topic}` }],
  });

  const rawText = message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  const cleaned = rawText.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`인스타툰 기획 응답을 JSON으로 파싱하지 못했습니다: ${err.message}\n원본: ${rawText.slice(0, 300)}`);
  }
  if (!Array.isArray(parsed.panels) || parsed.panels.length === 0) {
    throw new Error(`기획 응답에 panels 배열이 없습니다: ${JSON.stringify(parsed).slice(0, 300)}`);
  }
  return parsed.panels.map((p) => ({ text: String(p.text || '').trim(), imageDescription: String(p.imageDescription || '').trim() }));
}
