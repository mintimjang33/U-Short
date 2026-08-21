// "발견하기" 템플릿 44종의 정체 = 레이아웃 5종(이미 있음) × 제목(title) 텍스트 색상/강조 스타일.
// 실제 사이트에서 확인한 조합(흰색 기본, 노랑/빨강 하이라이트 박스, 청록 텍스트, 형광펜, 굵은 외곽선 등)을
// 그대로 재현한 프리셋 8종. 레이아웃과 독립적으로 어느 레이아웃에나 적용할 수 있다.
export const TITLE_PRESETS = {
  'title-white-basic': {
    label: '기본 화이트',
    line1: { color: '#ffffff' },
    line2: { color: '#ffffff' },
  },
  'title-white-outline': {
    label: '화이트 굵은 외곽선',
    line1: { color: '#ffffff', outlineColor: '#000000', outlineWidth: 6 },
    line2: { color: '#ffffff', outlineColor: '#000000', outlineWidth: 6 },
  },
  'title-yellow-highlight': {
    label: '노랑 강조박스 (2번째 줄)',
    line1: { color: '#ffffff' },
    line2: { color: '#1a1a1a', backgroundColor: '#ffe14d' },
  },
  'title-red-highlight': {
    label: '빨강 강조박스 (2번째 줄)',
    line1: { color: '#ffffff' },
    line2: { color: '#ffffff', backgroundColor: '#ff3b3b' },
  },
  'title-red-highlight-first': {
    label: '빨강 강조박스 (첫째 줄)',
    line1: { color: '#ffffff', backgroundColor: '#ff3b3b' },
    line2: { color: '#ffffff' },
  },
  'title-teal': {
    label: '청록 텍스트',
    line1: { color: '#5eead4' },
    line2: { color: '#5eead4' },
  },
  'title-yellow-text': {
    label: '노랑 텍스트',
    line1: { color: '#ffe14d', outlineColor: '#1a1a1a', outlineWidth: 4 },
    line2: { color: '#ffe14d', outlineColor: '#1a1a1a', outlineWidth: 4 },
  },
  'title-marker-yellow': {
    label: '형광펜 (반투명 노랑)',
    line1: { color: '#1a1a1a' },
    line2: { color: '#1a1a1a', backgroundColor: 'rgba(255,225,77,0.75)' },
  },
};

export const DEFAULT_TITLE_PRESET_ID = 'title-white-basic';

export function getTitlePreset(id) {
  return TITLE_PRESETS[id] || TITLE_PRESETS[DEFAULT_TITLE_PRESET_ID];
}
