import './globals.css';

export const metadata = {
  title: '슈퍼쇼츠 클론',
  description: '블로그 URL로 쇼츠를 자동 제작하는 개인용 로컬 도구',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="sidebar-logo">⚡ 슈퍼쇼츠 클론</div>
            <a className="sidebar-cta" href="/new">
              + 쇼츠 새로 제작
            </a>
            <nav className="sidebar-nav">
              <a href="/">내 프로젝트</a>
              <a href="/templates">템플릿</a>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
