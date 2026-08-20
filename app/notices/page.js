export default function NoticesPage() {
  return (
    <div style={{ maxWidth: 640, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
      <a href="/" style={{ fontSize: 13, color: '#9c9cb5' }}>
        ← 돌아가기
      </a>
      <div className="card" style={{ marginTop: 16, padding: 60 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📢</div>
        <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>공지사항이 아직 없어요</h1>
        <p style={{ fontSize: 13, color: '#9c9cb5' }}>새 소식이 있으면 여기에 올라올 예정이에요.</p>
      </div>
    </div>
  );
}
