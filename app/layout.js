import './globals.css';

export const metadata = {
  title: 'UShort',
  description: 'URL로 쇼츠를 자동 제작하는 AI 숏폼 영상 서비스',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
