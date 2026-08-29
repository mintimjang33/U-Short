// 화면(새 프로젝트/템플릿 에디터)과 API 라우트가 공유하는 선택지 정의.
// 실사이트(/business/docs 생성 옵션 표, /templates 자막 탭)에서 확인한 값 기준.

// 한국어 TTS 보통 속도 기준 근사치. lib/generateScript.js(대본 글자수 목표)와
// lib/pipeline.js(alignment 없을 때 음성 길이 추정) 둘 다 이 값을 공유해서 서로 어긋나지 않게 한다.
export const APPROX_CHARS_PER_SECOND = 5.5;

export const SCRIPT_STYLES = [
  { id: 'summary', label: '핵심 요약형' },
  { id: 'hook', label: '후킹 강조형' },
  { id: 'list', label: '정보 나열형' },
  { id: 'shopping', label: '🛍️ 쇼핑 구매유도형' },
  { id: 'twist-reveal', label: '🏛️ 반전 지식형 (신비한 건축사전류)' },
];

// videoMode: 'static'(기본, 이미지/영상 URL을 직접 지정) | 'ai-generated'(장면별 AI 영상 클립 자동 생성).
// ai-generated는 videoProvider로 사용할 모델을 고른다 — lib/generateVideoClips.js, lib/planScenes.js 참고.
export const VIDEO_MODES = [
  { id: 'static', label: '정적 이미지/영상 (기본)' },
  { id: 'ai-generated', label: 'AI 생성 영상 (실험적, 클립당 비용 발생)' },
];

// fal.ai 큐 API로 호출하는 영상 생성 모델. TTS와 같은 FAL_KEY를 재사용한다(새 계정 불필요).
// 2026-08 시세 비교(초당 단가 낮은 순) 기준 wan을 기본값으로 골랐다 — lib/generateVideoClips.js 헤더 참고.
export const VIDEO_PROVIDERS = [
  { id: 'wan', label: 'Wan v2.6 (fal.ai, 기본 · 8초당 약 $0.4, 가성비 1순위)' },
  { id: 'kling', label: 'Kling v3 Standard (fal.ai, 8초당 약 $0.6~0.7, 균형점)' },
  { id: 'seedance', label: 'Seedance 2.0 Fast (fal.ai, ByteDance · 역동적 카메라워크)' },
  { id: 'veo', label: 'Veo 3.1 Lite (fal.ai, 고품질 · 가장 비쌈)' },
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

// generate_image(lib/generateImage.js) 프롬프트에 덧붙이는 화풍 지시문. Qventor의 "그림체 스타일"과 같은 개념.
export const ART_STYLE_PRESETS = [
  { id: '2d-illustration', label: '2D 일러스트', promptModifier: 'clean 2D digital illustration style, flat colors, soft shading' },
  { id: 'pencil-sketch', label: '연필 그림', promptModifier: 'pencil sketch drawing style, hand-drawn graphite texture, monochrome' },
  { id: 'watercolor', label: '수채화', promptModifier: 'watercolor painting style, soft washes of color, paper texture' },
  { id: 'korean-webtoon', label: '한국형 웹툰', promptModifier: 'Korean webtoon (manhwa) art style, clean lineart, cel shading, expressive characters' },
  { id: 'hand-drawn', label: '손그림', promptModifier: 'cute hand-drawn doodle style, simple lines, casual sketch feel' },
  { id: 'ink-wash', label: '수묵화', promptModifier: 'traditional Korean/East Asian ink wash painting style, monochrome brushstrokes' },
];

export const LAYOUTS = [
  { id: 'info', label: '정보 레이아웃', compositionId: 'InfoLayout' },
  { id: 'card', label: '카드형 레이아웃', compositionId: 'CardLayout' },
  { id: 'full-focused', label: '풀레이아웃', compositionId: 'FullFocusedLayout' },
  { id: 'image-dark', label: '정보성 다크', compositionId: 'ImageDarkLayout' },
  {
    id: 'viral-mint',
    label: '바이럴민트 (인물 영상 업로드 필요)',
    compositionId: 'ViralMintLayout',
    requiresVideoUpload: true,
  },
];

export const CAPTION_PRESET_LIST = [
  { id: 'existing-preset-bold-white-outline', label: '기본 · 흰글씨 굵은 외곽선' },
  { id: 'existing-preset-black-bar-bold', label: '기본 · 검정박스 흰글씨' },
  { id: 'existing-preset-yellow-accent-bold', label: '노랑 볼드' },
  { id: 'existing-preset-minimal-white', label: '미니멀 화이트' },
  { id: 'existing-preset-pastel-blue', label: '파스텔 블루' },
  { id: 'existing-preset-punch-outline', label: '펀치 아웃라인' },
  { id: 'existing-preset-pink-rounded', label: '핑크 라운드' },
  { id: 'existing-preset-black-pill', label: '블랙 알약' },
];

// "발견하기" 템플릿 44종의 정체 = 레이아웃 5종(LAYOUTS) × 이 제목 색상/강조 스타일의 조합.
export const TITLE_PRESET_LIST = [
  { id: 'title-white-basic', label: '기본 화이트' },
  { id: 'title-white-outline', label: '화이트 굵은 외곽선' },
  { id: 'title-yellow-highlight', label: '노랑 강조박스 (2번째 줄)' },
  { id: 'title-red-highlight', label: '빨강 강조박스 (2번째 줄)' },
  { id: 'title-red-highlight-first', label: '빨강 강조박스 (첫째 줄)' },
  { id: 'title-teal', label: '청록 텍스트' },
  { id: 'title-yellow-text', label: '노랑 텍스트' },
  { id: 'title-marker-yellow', label: '형광펜 (반투명 노랑)' },
];

// 자막 색상/폰트(위 CAPTION_PRESET_LIST)와 별개로 얹는 등장/움직임 애니메이션.
export const CAPTION_ANIMATION_LIST = [
  { id: 'none', label: '없음' },
  { id: 'pop', label: '팝 (통통 튀며 등장)' },
  { id: 'shake', label: '흔들기' },
  { id: 'fire', label: '불타는 자막' },
];

// 실사이트 API 문서(introTemplateId 1~10번)의 이름 기준. remotion/src/introPresets.js와 id 일치.
export const INTRO_TEMPLATE_LIST = [
  { id: 'cute-confession-intro', label: '큐트 고백' },
  { id: 'legend-dive-intro', label: '레전드 다이브' },
  { id: 'one-hour-gift-intro', label: '1시간 선물' },
  { id: 'cool-living-room-intro', label: '시원한 거실' },
  { id: 'moving-tip-intro', label: '이사 꿀팁' },
  { id: 'half-price-house-intro', label: '반값 집' },
  { id: 'isa-warning-intro', label: '주의 경고' },
  { id: 'jeju-best-intro', label: '제주 베스트' },
  { id: 'wedding-snap-intro', label: '웨딩 스냅' },
  { id: 'seoul-house-intro', label: '서울 집' },
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
  { id: 'recorded', label: '내 목소리 녹음 (TTS 없이 직접 녹음한 음성 사용)' },
];

// 실사이트 API 문서("생성 옵션" 표)의 음성 alias 23종. voiceProvider가 fal일 때만 의미 있음
// (lib/voicePresets.js의 falVoice 매핑을 통해 실제 fal.ai 보이스로 변환됨).
export { VOICE_PRESETS as VOICE_PRESET_LIST } from './voicePresets.js';
