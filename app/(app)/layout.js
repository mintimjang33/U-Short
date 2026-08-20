import { getCurrentUser } from '../../lib/supabaseServerAuth.js';
import SignOutButton from './SignOutButton.jsx';

export default async function AppLayout({ children }) {
  const user = await getCurrentUser();
  const isOwner = user?.email && user.email === process.env.OWNER_EMAIL;

  return (
    <div className="shell">
      <aside className="sidebar">
        <a href="/" className="sidebar-logo" style={{ textDecoration: 'none' }}>
          ⚡ UShort
        </a>
        <a className="sidebar-cta" href="/new">
          + 쇼츠 새로 제작
        </a>
        <nav className="sidebar-nav">
          <a href="/dashboard">내 프로젝트</a>
          <a href="/templates">템플릿</a>
          {isOwner && <a href="/admin">관리자</a>}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #2a2a3c' }}>
          <div style={{ fontSize: 12, color: '#9c9cb5', marginBottom: 8, wordBreak: 'break-all' }}>
            {user?.email}
          </div>
          <SignOutButton />
          <div style={{ marginTop: 10 }}>
            <a href="/policy/terms" style={{ fontSize: 11, color: '#6b6b85', marginRight: 10 }}>
              이용약관
            </a>
            <a href="/policy/privacy" style={{ fontSize: 11, color: '#6b6b85' }}>
              개인정보처리방침
            </a>
          </div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
