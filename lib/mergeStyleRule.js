/**
 * 이미지 스타일 세트(image_style_sets)의 learned_rules에 새 교정 내용을 병합한다.
 * 실제 사례(유튜브: 인스타툰 작가 애린님 캐러셀 자동화, 2026-08-21)에서 확인된 패턴 —
 * "지적할 때마다 AI가 스스로 캐릭터 규칙을 업데이트"하는 것과 같은 개념. 매번 새로 설명하지
 * 않고, 지적 한 번이 누적된 규칙 문서로 쌓여서 다음 생성부터 자동으로 반영된다.
 * lib/analyzeScriptStyle.js와 같은 패턴(Claude로 텍스트 정제)을 이미지 스타일에 적용.
 */
import Anthropic from '@anthropic-ai/sdk';

const MERGE_SYSTEM_PROMPT = [
  '너는 AI 이미지 생성용 캐릭터/스타일 규칙 문서를 관리하는 편집자다.',
  '기존 규칙 목록과, 사용자가 방금 지적한 새 교정 사항 하나가 주어진다.',
  '새 교정 사항을 기존 규칙에 병합해서, 다음 이미지 생성 프롬프트에 그대로 덧붙일 수 있는',
  '한국어 규칙 목록을 출력해라.',
  '규칙 하나당 한 줄, "- " 로 시작하는 불릿 형태로 작성한다.',
  '기존 규칙과 내용이 겹치거나 충돌하면 새 지적 내용으로 덮어써라(예: 기존에 "다리는 4개"가',
  '있었는데 새 지적이 "다리는 2개여야 함"이면, 기존 줄을 지우고 새 규칙으로 교체한다).',
  '완전히 새로운 지적이면 목록 끝에 추가한다.',
  '규칙은 이미지 생성 프롬프트에 영어로 그대로 붙기 좋게, 간결하고 구체적인 지시문으로 쓴다',
  '(예: "- 다리는 항상 2개만 그릴 것", "- 실선이 끊기지 않게 이어그릴 것").',
  '설명이나 마크다운 헤더 없이 불릿 목록만 출력한다. 최대 15개 규칙까지만 유지하고,',
  '그 이상이면 가장 오래되고 덜 중요해 보이는 것부터 제거해라.',
].join('\n');

export async function mergeStyleRule({ existingRules, correction }) {
  if (!correction || correction.trim().length === 0) {
    throw new Error('mergeStyleRule: correction이 비어있습니다.');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다.');
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const userMessage = [
    `[기존 규칙]\n${existingRules && existingRules.trim() ? existingRules.trim() : '(아직 없음)'}`,
    `[새 지적 사항]\n${correction.trim()}`,
  ].join('\n\n');
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: MERGE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });
  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}
