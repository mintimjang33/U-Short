/**
 * 레퍼런스 대본(사용자가 붙여넣은 기존 대본)을 분석해서, generateScript.js가 STYLE_GUIDE 대신
 * 쓸 수 있는 "스타일 규칙" 텍스트를 뽑아낸다. Qventor의 "대본 스타일 관리"(레퍼런스→DNA분석→저장)
 * 기능과 같은 개념 — generateScript.js와 같은 AI provider(claude/gemini/gpt)를 그대로 재사용한다.
 */
import Anthropic from '@anthropic-ai/sdk';

const ANALYZE_SYSTEM_PROMPT = [
  '너는 영상 내레이션 대본의 말투/톤/구조를 분석하는 전문가다.',
  '아래에 주어지는 레퍼런스 대본 하나를 읽고, 이 대본의 문체적 특징을 다른 AI가 참고해서',
  '같은 스타일로 새 대본을 쓸 수 있도록 규칙 형태로 뽑아내라.',
  '분석할 것: 문장 길이/호흡, 어미(반말/존댓말/구어체 정도), 도입부 패턴(훅을 여는 방식),',
  '전개 순서, 강조 표현 습관, 마무리 방식, 자주 쓰는 접속사나 말버릇.',
  '내용(소재)이 아니라 "형식/문체"만 뽑아라 — 다른 주제에도 적용 가능해야 한다.',
  '150~300자 내외의 한국어 지침 문장으로, "~하게 쓴다", "~로 시작한다" 같은 지시문 형태로 작성한다.',
  '설명 문장이나 마크다운 없이 지침 텍스트만 출력한다.',
].join('\n');

async function analyzeWithClaude(referenceText) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다.');
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    system: ANALYZE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: referenceText.slice(0, 20000) }],
  });
  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

/**
 * @param {string} referenceText - 사용자가 붙여넣은 레퍼런스 대본 (최대 20,000자)
 * @param {'claude'|'gemini'|'gpt'} [provider] - 기본 claude(스타일 분석은 요약형 짧은 응답이라 provider 구분 없이 claude 고정도 충분하지만, 확장 여지로 provider만 받아두고 지금은 claude로 처리)
 * @returns {Promise<string>} styleDescription - generateScript.js의 STYLE_GUIDE 자리에 그대로 들어갈 수 있는 지침 텍스트
 */
export async function analyzeScriptStyle(referenceText) {
  if (!referenceText || referenceText.trim().length < 30) {
    throw new Error('analyzeScriptStyle: referenceText가 비어있거나 너무 짧습니다(30자 이상 필요).');
  }
  return analyzeWithClaude(referenceText.trim());
}
