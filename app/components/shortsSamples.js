// 랜딩페이지 목업 샘플 데이터. 'use client' 컴포넌트(HeroShortsPreview.jsx)와
// 서버 컴포넌트(app/page.js) 양쪽에서 같이 쓰기 때문에 별도 순수 데이터 파일로 분리한다.
// ('use client' 모듈의 배열/객체 export는 서버 컴포넌트로 직접 넘어오지 않는 문제가 있어서 분리함)
//
// picsum.photos 등 외부 이미지 서비스는 응답이 느리거나 멈추는 경우가 있어(로딩 실패 확인됨),
// 랜딩페이지처럼 항상 안정적으로 떠야 하는 곳엔 외부 의존 없는 CSS 그라디언트를 대신 쓴다.
export const SAMPLES = [
  {
    kind: 'info',
    gradient: 'linear-gradient(160deg, #2563eb, #0891b2)',
    titleLine1: '제주 숨은 카페',
    titleLine2: '노을 맛집 3곳',
    captionText: '여기 진짜 인생샷 나옵니다',
    caption: { fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: 58, color: '#ffffff', backgroundColor: null, outlineColor: '#000000', outlineWidth: 8, shadow: false },
  },
  {
    kind: 'card',
    gradient: 'linear-gradient(160deg, #b45309, #dc2626)',
    titleLine1: '연말정산 미리',
    titleLine2: '준비하는 법',
    captionText: '12월에 이거 하나면 끝',
    caption: { fontFamily: 'Pretendard, sans-serif', fontWeight: 700, fontSize: 52, color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.75)', outlineColor: null, outlineWidth: 0, shadow: false },
  },
  {
    kind: 'full-focused',
    gradient: 'linear-gradient(160deg, #7e22ce, #db2777)',
    titleLine1: '자취 필수템',
    titleLine2: '10가지 추천',
    captionText: '이거 없으면 후회함',
    caption: { fontFamily: 'Pretendard, sans-serif', fontWeight: 700, fontSize: 50, color: '#ffffff', backgroundColor: '#ff6fa5', outlineColor: null, outlineWidth: 0, shadow: false, pill: true },
  },
  {
    kind: 'image-dark',
    gradient: 'linear-gradient(160deg, #0f172a, #334155)',
    titleLine1: '겨울 캠핑 장비',
    titleLine2: '체크리스트',
    captionText: '이거 하나면 완전군장',
    caption: { fontFamily: 'Pretendard, sans-serif', fontWeight: 900, fontSize: 60, color: '#ffffff', backgroundColor: null, outlineColor: '#ff3b6f', outlineWidth: 10, shadow: false },
  },
];
