export default function BlogPage() {
  return (
    <div style={{ maxWidth: 640, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
      <a href="/" style={{ fontSize: 13, color: '#9ca3af' }}>
        ← 돌아가기
      </a>
      <div className="card" style={{ marginTop: 16, padding: 60 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
        <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>블로그 준비 중이에요</h1>
        <p style={{ fontSize: 13, color: '#9ca3af' }}>쇼츠 제작 팁과 활용 사례를 곧 소개할 예정이에요.</p>
      </div>
    </div>
  );
}
