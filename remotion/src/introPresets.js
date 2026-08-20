// 실사이트 API 문서(introTemplateId 1~10번)의 이름에서 테마를 유추해 10종 재현.
// 실제 비주얼은 로그인 없이 확인 불가능해서, 이름이 암시하는 분위기(색/톤)로 새로 디자인함.
export const INTRO_PRESETS = {
  'cute-confession-intro': {
    label: '큐트 고백',
    background: 'linear-gradient(160deg, #ff8fb3, #ff5c8a)',
    accent: '#fff0f5',
    badge: '💌',
  },
  'legend-dive-intro': {
    label: '레전드 다이브',
    background: 'linear-gradient(160deg, #0f2942, #061019)',
    accent: '#7dd3fc',
    badge: '🌊',
  },
  'one-hour-gift-intro': {
    label: '1시간 선물',
    background: 'linear-gradient(160deg, #ff9a3c, #ff5e1a)',
    accent: '#fff7ed',
    badge: '🎁',
  },
  'cool-living-room-intro': {
    label: '시원한 거실',
    background: 'linear-gradient(160deg, #14b8a6, #0f766e)',
    accent: '#ecfeff',
    badge: '🛋️',
  },
  'moving-tip-intro': {
    label: '이사 꿀팁',
    background: 'linear-gradient(160deg, #3b82f6, #1d4ed8)',
    accent: '#eff6ff',
    badge: '📦',
  },
  'half-price-house-intro': {
    label: '반값 집',
    background: 'linear-gradient(160deg, #ef4444, #b91c1c)',
    accent: '#fef2f2',
    badge: '🏠',
  },
  'isa-warning-intro': {
    label: '주의 경고',
    background: 'linear-gradient(160deg, #f59e0b, #b45309)',
    accent: '#111827',
    badge: '⚠️',
  },
  'jeju-best-intro': {
    label: '제주 베스트',
    background: 'linear-gradient(160deg, #22c55e, #15803d)',
    accent: '#f0fdf4',
    badge: '🌴',
  },
  'wedding-snap-intro': {
    label: '웨딩 스냅',
    background: 'linear-gradient(160deg, #f9a8d4, #ec4899)',
    accent: '#fdf2f8',
    badge: '💍',
  },
  'seoul-house-intro': {
    label: '서울 집',
    background: 'linear-gradient(160deg, #64748b, #334155)',
    accent: '#f8fafc',
    badge: '🏙️',
  },
};

export const DEFAULT_INTRO_PRESET_ID = 'cool-living-room-intro';

export function getIntroPreset(id) {
  return INTRO_PRESETS[id] || INTRO_PRESETS[DEFAULT_INTRO_PRESET_ID];
}
