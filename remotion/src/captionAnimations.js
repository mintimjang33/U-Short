// "새 기능 - 이미지 슬롯 · 움직이는 자료 · 카드형 템플릿 · 자막 효과" 업데이트에서 언급된
// 불타는 자막 / 팝 / 흔들기 애니메이션. 자막 색상·폰트는 captionPresets.js(기존 8종, 실사이트
// 문서 그대로 재현)가 담당하고, 이건 그 위에 얹는 "움직임"만 독립적으로 선택할 수 있게 분리했다.
export const CAPTION_ANIMATIONS = {
  none: { label: '없음' },
  pop: { label: '팝 (통통 튀며 등장)' },
  shake: { label: '흔들기 (좌우로 흔들림)' },
  fire: { label: '불타는 자막 (주황빛 글로우 + 흔들림)' },
};

export const DEFAULT_CAPTION_ANIMATION_ID = 'none';

export function getCaptionAnimation(id) {
  return CAPTION_ANIMATIONS[id] || CAPTION_ANIMATIONS[DEFAULT_CAPTION_ANIMATION_ID];
}
