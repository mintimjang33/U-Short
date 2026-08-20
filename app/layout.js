import './globals.css';

export const metadata = {
  title: '슈퍼쇼츠 클론',
  description: '블로그 URL로 쇼츠를 자동 제작하는 개인용 로컬 도구',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
