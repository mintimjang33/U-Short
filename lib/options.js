// 화면(새 프로젝트/템플릿 에디터)과 API 라우트가 공유하는 선택지 정의.
// 실사이트(/business/docs 생성 옵션 표, /templates 자막 탭)에서 확인한 값 기준.

// 한국어 TTS 보통 속도 기준 근사치. lib/generateScript.js(대본 글자수 목표)와
// lib/pipeline.js(alignment 없을 때 음성 길이 추정) 둘 다 이 값을 공유해서 서로 어긋나지 않게 한다.
export const APPROX_CHARS_PER_SECOND = 5.5;

export const SCRIPT_STYLES = [
  { id: 'summary', label: '핵심 요약형' },
  { id: 'hook', label: '후킹 강조형' },
  { id: 'list', label: '정보 나열형' },
];

export const OUTPUT_LANGUAGES = [
  { id: 'original', label: '원문 유지' },
  { id: 'ko', label: '한국어' },
  { id: 'en', label: '영어' },
  { id: 'ja', label: '일본어' },
];

// secMin/secMax: 대본 생성(lib/generateScript.js)과 길이 추정에 공통으로 쓰는 목표 낭독 길이.
export const LENGTH_MODES = [
  { id: 'shortform', label: '짧게 (10~20초)', credits: 1, secMin: 10, secMax: 20 },
  { id: 'longform', label: '길게 (30~60초)', credits: 2, secMin: 30, secMax: 60 },
  { id: 'extended', label: '아주 길게 (1~2분)', credits: 4, secMin: 60, secMax: 120 },
];

export const LAYOUTS = [
  { id: 'info', label: '정보 레이아웃', compositionId: 'InfoLayout' },
  { id: 'card', label: '카드형 레이아웃', compositionId: 'CardLayout' },
];

export const CAPTION_PRESET_LIST = [
  { id: 'existing-preset-bold-white-outline', label: '기본 · 흰글씨 굵은 외곽선' },
  { id: 'existing-preset-black-bar-bold', label: '기본 · 검정박스 흰글씨' },
  { id: 'existing-preset-yellow-accent-bold', label: '노랑 볼드' },
  { id: 'existing-preset-minimal-white', label: '미니멀 화이트' },
  { id: 'existing-preset-pastel-blue', label: '파스텔 블루' },
  { id: 'existing-preset-punch-outline', label: '펀치 아웃라인' },
];

export const SCRIPT_PROVIDERS = [
  { id: 'claude', label: 'Claude (Anthropic)' },
  { id: 'gemini', label: 'Gemini (무료 연습용)' },
  { id: 'gpt', label: 'GPT (OpenAI)' },
];

export const VOICE_PROVIDERS = [
  { id: 'fal', label: 'fal.ai (기본, 보유 키로 바로 사용)' },
  { id: 'elevenlabs', label: 'ElevenLabs (무료 티어 연습용)' },
  { id: 'clova', label: 'Naver CLOVA Voice (월 9만원 고정비, 대량 운영용)' },
];
