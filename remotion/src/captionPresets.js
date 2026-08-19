// 슈퍼쇼츠 실사이트 자막 탭에서 확인한 프리셋 18종 중 대표적인 6종을 재현.
// ID는 실사이트 API 문서(생성 옵션 표)에 나온 kebab-case 네이밍을 그대로 따름.
export const CAPTION_PRESETS = {
  'existing-preset-bold-white-outline': {
    label: '기본 · 흰글씨 굵은 외곽선',
    fontFamily: 'Pretendard, sans-serif',
    fontWeight: 800,
    fontSize: 58,
    color: '#ffffff',
    backgroundColor: null,
    outlineColor: '#000000',
    outlineWidth: 8,
    shadow: false,
  },
  'existing-preset-black-bar-bold': {
    label: '기본 · 검정박스 흰글씨',
    fontFamily: 'Pretendard, sans-serif',
    fontWeight: 700,
    fontSize: 52,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.75)',
    outlineColor: null,
    outlineWidth: 0,
    shadow: false,
  },
  'existing-preset-yellow-accent-bold': {
    label: '노랑 볼드',
    fontFamily: 'Pretendard, sans-serif',
    fontWeight: 800,
    fontSize: 56,
    color: '#ffd400',
    backgroundColor: null,
    outlineColor: '#1a1a1a',
    outlineWidth: 6,
    shadow: false,
  },
  'existing-preset-minimal-white': {
    label: '미니멀 화이트',
    fontFamily: 'Pretendard, sans-serif',
    fontWeight: 500,
    fontSize: 46,
    color: '#ffffff',
    backgroundColor: null,
    outlineColor: null,
    outlineWidth: 0,
    shadow: true,
  },
  'existing-preset-pastel-blue': {
    label: '파스텔 블루',
    fontFamily: 'Pretendard, sans-serif',
    fontWeight: 700,
    fontSize: 52,
    color: '#eaf6ff',
    backgroundColor: 'rgba(84,164,255,0.35)',
    outlineColor: null,
    outlineWidth: 0,
    shadow: false,
  },
  'existing-preset-punch-outline': {
    label: '펀치 아웃라인',
    fontFamily: 'Pretendard, sans-serif',
    fontWeight: 900,
    fontSize: 60,
    color: '#ffffff',
    backgroundColor: null,
    outlineColor: '#ff3b6f',
    outlineWidth: 10,
    shadow: false,
  },
};

export const DEFAULT_CAPTION_PRESET_ID = 'existing-preset-bold-white-outline';

export function getCaptionPreset(id) {
  return CAPTION_PRESETS[id] || CAPTION_PRESETS[DEFAULT_CAPTION_PRESET_ID];
}
