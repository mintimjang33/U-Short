/**
 * 주제(topic)를 카드뉴스 N장 기획으로 쪼갠다. 인스타툰(planInstatoon.js)과 달리 스토리 진행이
 * 아니라 "정보 전달" 포맷이다 — 카드1은 표지(강한 훅 제목), 중간 카드들은 정보 포인트 1~2줄,
 * 마지막 카드는 요약/참여유도. 이 규칙은 HongHub의 인스타그램 카드뉴스 플랫폼 가이드와
 * 동일한 컨벤션을 따른다(카드1: 표지, 마지막: 요약/참여유도, 카드당 1~2줄 짧게).
 */
import Anthropic from '@anthropic-ai/sdk';

function buildSystemPrompt(cardCount) {
  return [
    `너는 인스타그램 카드뉴스 작가다. 주어진 주제로 정확히 ${cardCount}장의 카드뉴스를 기획한다.`,
    '카드뉴스는 스토리가 아니라 정보 전달 포맷이다. 구성 규칙:',
    `1번 카드(type: "cover"): 표지. 강한 훅이 되는 제목 한 줄(title). 클릭/저장하고 싶게 만드는 문구.`,
    `2번부터 ${cardCount - 1}번 카드(type: "body"): 정보 포인트 하나씩. 짧은 소제목(title)과 1~2줄 본문(text).`,
    `${cardCount}번 카드(type: "summary"): 요약 또는 참여 유도(저장/공유/댓글 유도) 문구.`,
    '카드마다 다음을 만든다:',
    '1) title: 그 카드의 짧은 제목/소제목(한국어, 20자 내외)',
    '2) text: 본문 텍스트(한국어, 표지/요약 카드는 짧은 부제 한 줄, 정보 카드는 1~2줄 이내)',
    '3) imageDescription: 그 카드의 배경 이미지를 영어로 묘사한 프롬프트. 카드뉴스는 정보성 콘텐츠라',
    '   실사/일러스트 등 주제에 어울리는 깔끔한 배경을 묘사한다(텍스트를 이미지 안에 그리라고 하지 말 것 — 텍스트는 별도 레이어로 합성됨).',
    '반드시 아래 JSON 스키마만 출력한다. 다른 설명, 마크다운 코드펜스는 절대 포함하지 않는다.',
    `{"cards": [{"type": "cover"|"body"|"summary", "title": string, "text": string, "imageDescription": string}, ...]} (배열 길이 정확히 ${cardCount}, 첫 장은 cover, 마지막 장은 summary, 나머지는 body)`,
  ].join('\n');
}

/**
 * @param {string} topic - 카드뉴스 주제(예: "퇴근 후 30분 홈트 루틴")
 * @param {number} [cardCount] - 카드 수, 기본 6, 최대 10, 최소 3(표지+정보1+요약)
 * @returns {Promise<{type: string, title: string, text: string, imageDescription: string}[]>}
 */
export async function planCardnews(topic, cardCount = 6) {
  if (!topic || topic.trim().length === 0) {
    throw new Error('planCardnews: topic이 비어있습니다.');
  }
  const count = Math.min(10, Math.max(3, cardCount));
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
    throw new Error(`카드뉴스 기획 응답을 JSON으로 파싱하지 못했습니다: ${err.message}\n원본: ${rawText.slice(0, 300)}`);
  }
  if (!Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new Error(`기획 응답에 cards 배열이 없습니다: ${JSON.stringify(parsed).slice(0, 300)}`);
  }
  let cards = parsed.cards.map((c) => ({
    type: ['cover', 'body', 'summary'].includes(c.type) ? c.type : 'body',
    title: String(c.title || '').trim(),
    text: String(c.text || '').trim(),
    imageDescription: String(c.imageDescription || '').trim(),
  }));

  // AI가 요청한 장수를 정확히 안 지킬 때가 있다(실측: 5장 요청했는데 6장 반환한 사례).
  // card_count DB 필드/UI 진행률 표시와 어긋나지 않도록 여기서 강제로 맞춘다 — 표지(첫 장)와
  // 요약(마지막 장)은 유지하고, 중간 body 카드만 잘라내거나 마지막 body를 복제해서 채운다.
  if (cards.length > count) {
    const cover = cards[0];
    const summary = cards[cards.length - 1];
    const body = cards.slice(1, -1).slice(0, count - 2);
    cards = [cover, ...body, summary];
  } else if (cards.length < count) {
    while (cards.length < count) {
      const lastBody = cards[cards.length - 2] || cards[0];
      cards.splice(cards.length - 1, 0, { ...lastBody });
    }
  }

  return cards;
}
