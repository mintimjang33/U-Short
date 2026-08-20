import { CAPTION_PRESETS } from '../../remotion/src/captionPresets.js';

// 랜딩페이지 목업 샘플 데이터. 'use client' 컴포넌트(HeroShortsPreview.jsx)와
// 서버 컴포넌트(app/page.js) 양쪽에서 같이 쓰기 때문에 별도 순수 데이터 파일로 분리한다.
// ('use client' 모듈의 배열/객체 export는 서버 컴포넌트로 직접 넘어오지 않는 문제가 있어서 분리함)
//
// 사진은 Pexels(실제 API 키로 검색해서 받음, 상업적 사용 무료 라이선스)에서 받아
// public/landing/에 정적으로 저장해둔 것 — 외부 이미지 서비스(picsum 등)는 응답이 느리거나
// 멈추는 문제가 있어(로딩 실패 확인됨) 랜딩페이지처럼 항상 안정적으로 떠야 하는 곳엔 안 맞음.
// 자막 스타일은 실제 captionPresets.js 값을 그대로 순환 적용해서 다양하게 보이게 한다.
const LAYOUT_CYCLE = ['info', 'card', 'full-focused', 'image-dark'];
const CAPTION_CYCLE = Object.keys(CAPTION_PRESETS);

const RAW_SAMPLES = [
  { image: '/landing/sample-1-cafe.jpg', titleLine1: '제주 숨은 카페', titleLine2: '노을 맛집 3곳', captionText: '여기 진짜 인생샷 나옵니다' },
  { image: '/landing/sample-2-tax.jpg', titleLine1: '연말정산 미리', titleLine2: '준비하는 법', captionText: '12월에 이거 하나면 끝' },
  { image: '/landing/sample-3-apartment.jpg', titleLine1: '자취 원룸', titleLine2: '인테리어 꿀팁', captionText: '월세방도 이렇게 예뻐져요' },
  { image: '/landing/sample-4-camping.jpg', titleLine1: '겨울 캠핑 장비', titleLine2: '체크리스트', captionText: '이거 하나면 완전군장' },
  { image: '/landing/sample-5-workout.jpg', titleLine1: '홈트 루틴', titleLine2: '10분이면 충분', captionText: '헬스장 안 가도 됩니다' },
  { image: '/landing/sample-6-dog.jpg', titleLine1: '강아지 산책', titleLine2: '초보 가이드', captionText: '이것만 알면 산책이 편해져요' },
  { image: '/landing/sample-7-nightdrive.jpg', titleLine1: '서울 야경', titleLine2: '드라이브 코스', captionText: '오늘 밤 여기 어때요' },
  { image: '/landing/sample-8-baking.jpg', titleLine1: '홈베이킹', titleLine2: '실패 없는 레시피', captionText: '오븐 없어도 만들어요' },
  { image: '/landing/sample-9-hiking.jpg', titleLine1: '가을 등산', titleLine2: '초보 코스 추천', captionText: '숨차지 않게 오르는 법' },
  { image: '/landing/sample-10-bookcafe.jpg', titleLine1: '조용한 북카페', titleLine2: '혼자 가기 좋은 곳', captionText: '책 한 권 들고 떠나요' },
  { image: '/landing/sample-11-yoga.jpg', titleLine1: '아침 요가', titleLine2: '5분 루틴', captionText: '눈뜨자마자 이것부터' },
  { image: '/landing/sample-12-christmas.jpg', titleLine1: '크리스마스 홈파티', titleLine2: '준비 리스트', captionText: '이번 연말엔 집에서' },
];

export const SAMPLES = RAW_SAMPLES.map((s, i) => ({
  ...s,
  kind: LAYOUT_CYCLE[i % LAYOUT_CYCLE.length],
  caption: CAPTION_PRESETS[CAPTION_CYCLE[i % CAPTION_CYCLE.length]],
}));
