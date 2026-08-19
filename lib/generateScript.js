import Anthropic from '@anthropic-ai/sdk';
import { LENGTH_MODES, APPROX_CHARS_PER_SECOND } from './options.js';

const STYLE_GUIDE = {
  summary: '핵심 요약형: 글의 핵심 정보만 담백하게 압축해서, 가장 중요한 내용부터 순서대로 말하듯이 전달한다.',
  hook: '후킹 강조형: 첫 문장에서 시청자의 호기심이나 손해 회피 심리를 자극하는 후킹 멘트로 시작한 뒤 본론으로 들어간다.',
  list: '정보 나열형: "첫째, 둘째" 같은 번호 매기기보다는 자연스러운 구어체로 여러 항목을 하나씩 짚어가며 나열한다.',
};

const LANGUAGE_NAME = {
  ko: '한국어',
  en: '영어',
  ja: '일본어',
  original: null,
};

function buildSystemPrompt({ style, outputLanguage, planningMode, lengthMode }) {
  const styleDesc = STYLE_GUIDE[style] || STYLE_GUIDE.summary;
  const langName = LANGUAGE_NAME[outputLanguage] ?? null;

  const languageInstruction = langName
    ? `내레이션과 제목은 반드시 ${langName}로 작성한다.`
    : '내레이션과 제목은 입력된 원문의 언어를 그대로 유지한다.';

  const modeInstruction =
    planningMode === 'direct'
      ? '입력된 sourceText는 사용자가 이미 확정한 최종 대본이다. narration 필드에는 이 텍스트를 문장 손질(오탈자·구어체 다듬기) 외에는 내용을 바꾸지 말고 그대로 담고, 너는 오직 그 내용에 어울리는 제목 2줄만 새로 만든다.'
      : '입력된 sourceText는 아직 다듬어지지 않은 원본 자료(블로그 본문)다. 이 내용을 바탕으로 9:16 세로 쇼츠 영상에서 TTS로 읽힐 내레이션 대본을 새로 기획해서 작성한다.';

  const lengthConfig = LENGTH_MODES.find((l) => l.id === lengthMode) || LENGTH_MODES[0];
  const charMin = Math.round(lengthConfig.secMin * APPROX_CHARS_PER_SECOND);
  const charMax = Math.round(lengthConfig.secMax * APPROX_CHARS_PER_SECOND);
  const lengthInstruction =
    planningMode === 'direct'
      ? null // direct 모드는 사용자가 이미 정한 분량을 그대로 쓰므로 글자수를 강제하지 않는다.
      : `내레이션 분량은 낭독 기준 ${lengthConfig.secMin}~${lengthConfig.secMax}초 분량인 ${charMin}~${charMax}자 내외로 만든다. 짧게 쓰지 말고 이 범위를 채울 것.`;

  return [
    '너는 블로그 글을 9:16 세로 쇼츠 영상 대본으로 바꾸는 작가다.',
    modeInstruction,
    `대본 스타일: ${styleDesc}`,
    languageInstruction,
    '내레이션은 TTS가 자연스럽게 읽을 수 있는 구어체 문장으로만 구성하고, 이모지·해시태그·마크다운 기호는 쓰지 않는다.',
    lengthInstruction,
    '제목은 화면에 큼직하게 뜨는 2줄짜리 훅 문구로, 각 줄은 12자 내외로 짧게 만든다.',
    '반드시 아래 JSON 스키마만 출력한다. 다른 설명, 마크다운 코드펜스는 절대 포함하지 않는다.',
    '{"titleLine1": string, "titleLine2": string, "narration": string}',
  ]
    .filter(Boolean)
    .join('\n');
}

function parseJsonResponse(rawText, providerLabel) {
  const cleaned = rawText.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`${providerLabel} 응답을 JSON으로 파싱하지 못했습니다: ${err.message}\n원본: ${rawText.slice(0, 300)}`);
  }
  if (!parsed.titleLine1 || !parsed.narration) {
    throw new Error(`${providerLabel} 응답에 필수 필드가 없습니다: ${JSON.stringify(parsed)}`);
  }
  return {
    titleLine1: String(parsed.titleLine1).trim(),
    titleLine2: String(parsed.titleLine2 || '').trim(),
    narration: String(parsed.narration).trim(),
  };
}

async function generateWithClaude({ sourceText, system }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다. .env.local을 확인하세요.');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048, // extended(1~2분) 모드는 최대 660자 내레이션까지 나올 수 있어 여유있게 잡음
    system,
    messages: [{ role: 'user', content: sourceText.slice(0, 8000) }],
  });

  const rawText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  return parseJsonResponse(rawText, 'Claude');
}

// 무료로 연습해볼 때 쓰라고 추가한 옵션. 2026-08 기준 무료 티어가 열려 있는 Flash 모델 사용.
const GEMINI_MODEL = 'gemini-2.5-flash';

async function generateWithGemini({ sourceText, system }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다. .env.local을 확인하세요.');
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: sourceText.slice(0, 8000) }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini 요청 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const rawText = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  if (!rawText) {
    throw new Error(`Gemini 응답에서 텍스트를 찾지 못했습니다: ${JSON.stringify(json).slice(0, 300)}`);
  }

  return parseJsonResponse(rawText, 'Gemini');
}

// 2026-08 기준 JSON 모드가 안정적으로 되는 저렴한 모델. 더 최신/저렴한 모델이 나오면 바꿔도 됨.
const OPENAI_MODEL = 'gpt-4o-mini';

async function generateWithOpenAI({ sourceText, system }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다. .env.local을 확인하세요.');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: sourceText.slice(0, 8000) },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`GPT 요청 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const rawText = json.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new Error(`GPT 응답에서 텍스트를 찾지 못했습니다: ${JSON.stringify(json).slice(0, 300)}`);
  }

  return parseJsonResponse(rawText, 'GPT');
}

/**
 * 블로그 본문 → 쇼츠 대본(제목 2줄 + 내레이션) 생성
 * @param {object} params
 * @param {string} params.sourceText - 추출된 블로그 본문 또는 사용자가 확정한 최종 대본
 * @param {'direct'|'auto'} [params.planningMode] - direct: sourceText를 그대로 사용, auto: AI가 재기획
 * @param {'summary'|'hook'|'list'} [params.style] - 대본 스타일
 * @param {'ko'|'en'|'ja'|'original'} [params.outputLanguage] - 출력 언어
 * @param {'shortform'|'longform'|'extended'} [params.lengthMode] - 목표 낭독 길이, 기본 shortform(10~20초)
 * @param {'claude'|'gemini'|'gpt'} [params.provider] - 지정 안 하면 SCRIPT_PROVIDER 환경변수(기본 claude) 사용
 * @returns {Promise<{titleLine1: string, titleLine2: string, narration: string}>}
 */
export async function generateScript({
  sourceText,
  planningMode = 'auto',
  style = 'summary',
  outputLanguage = 'original',
  lengthMode = 'shortform',
  provider,
}) {
  if (!sourceText || sourceText.trim().length < 10) {
    throw new Error('generateScript: sourceText가 비어있거나 너무 짧습니다.');
  }

  const system = buildSystemPrompt({ style, outputLanguage, planningMode, lengthMode });
  const resolvedProvider = (provider || process.env.SCRIPT_PROVIDER || 'claude').toLowerCase();

  if (resolvedProvider === 'gemini') {
    return generateWithGemini({ sourceText, system });
  }
  if (resolvedProvider === 'gpt' || resolvedProvider === 'openai') {
    return generateWithOpenAI({ sourceText, system });
  }
  return generateWithClaude({ sourceText, system });
}
