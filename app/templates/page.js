'use client';

import dynamic from 'next/dynamic';

// @remotion/player의 <Player>는 브라우저 전용(SSR 시 useRef가 깨짐)이라
// 빌드 타임 프리렌더링을 끄고 클라이언트에서만 로드한다.
const TemplateEditorInner = dynamic(() => import('./TemplateEditorInner.jsx'), {
  ssr: false,
  loading: () => <div className="card">에디터 불러오는 중...</div>,
});

export default function TemplateEditorPage() {
  return <TemplateEditorInner />;
}
