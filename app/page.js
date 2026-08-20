const scriptTypes = [
  { n: 1, label: '핵심 요약형 대본' },
  { n: 2, label: '후킹 강조형 대본' },
  { n: 3, label: '정보 나열형 대본' },
];

export default function LandingPage() {
  return (
    <div>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 32px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 16 }}>⚡ 슈퍼쇼츠</div>
        <a
          href="/login"
          style={{
            height: 36,
            padding: '0 20px',
            borderRadius: 9999,
            background: 'rgb(17,24,39)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          로그인
        </a>
      </header>

      <section style={{ textAlign: 'center', padding: '96px 24px 64px', maxWidth: 720, margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-block',
            fontSize: 13,
            color: '#6b7280',
            background: '#f3f4f6',
            borderRadius: 9999,
            padding: '6px 16px',
            marginBottom: 24,
          }}
        >
          크리에이터가 선택한 AI 자동 쇼츠 제작 생성기
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.25, marginBottom: 20, color: 'rgb(2,8,23)' }}>
          슈퍼쇼츠,
          <br />
          블로그 URL로 쇼츠를
          <br />
          1분 자동 제작
        </h1>
        <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 32, lineHeight: 1.6 }}>
          대본, 자막, 목소리까지
          <br />
          슈퍼쇼츠로 빠르고 쉽게 해결해 보세요.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <a
            href="/login"
            style={{
              padding: '12px 28px',
              borderRadius: 9999,
              background: 'rgb(17,24,39)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            무료로 시작하기
          </a>
          <a
            href="#preview"
            style={{
              padding: '12px 28px',
              borderRadius: 9999,
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: 'rgb(2,8,23)',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            샘플 보기
          </a>
        </div>
      </section>

      <section id="preview" className="card" style={{ maxWidth: 760, margin: '0 auto 64px', padding: 40 }}>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', fontWeight: 700, marginBottom: 24 }}>
          대본·자막·목소리까지 자동 · 평균 1분 완성
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {scriptTypes.map((s) => (
            <div
              key={s.n}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 9999,
                background: '#f9fafb',
                fontSize: 13,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgb(17,24,39)',
                  color: '#fff',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {s.n}
              </span>
              {s.label}
            </div>
          ))}
        </div>
      </section>

      <section style={{ textAlign: 'center', padding: '48px 24px', background: '#fafafa' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>지금도 쌓이는 유저들의 쇼츠</h2>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          블로거·크리에이터가 만든 쇼츠가 끊임없이 만들어지고 있어요.
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            borderRadius: 9999,
            border: '1px solid #e5e7eb',
            background: '#fff',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          나도 만들어 보기
        </a>
      </section>

      <section style={{ textAlign: 'center', padding: '64px 24px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>실제 폰에서 보는 것처럼, 세로 피드</h2>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          릴스·쇼츠처럼 세로 9:16 그대로, 폰에서 보던 느낌으로 재생돼요.
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            borderRadius: 9999,
            background: 'rgb(17,24,39)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          나도 만들어 보기
        </a>
      </section>

      <footer style={{ borderTop: '1px solid #f0f0f0', padding: '48px 32px', fontSize: 13, color: '#9ca3af' }}>
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: '#111827', marginBottom: 8 }}>⚡ 슈퍼쇼츠</div>
            <div>블로그 링크로 쇼츠를 자동 제작하는 AI 숏폼 영상 서비스</div>
            <div style={{ marginTop: 4 }}>블로그 글만으로 쇼츠를 만들어보세요</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#111827', marginBottom: 8 }}>서비스</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a href="/login" style={{ color: '#9ca3af' }}>
                새로 제작
              </a>
              <span>가격 안내</span>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#111827', marginBottom: 8 }}>지원</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>문의하기</span>
              <span>팀 소개</span>
              <span>공지사항</span>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#111827', marginBottom: 8 }}>법적 정보</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a href="/policy/terms" style={{ color: '#9ca3af' }}>
                이용약관
              </a>
              <a href="/policy/privacy" style={{ color: '#9ca3af' }}>
                개인정보처리방침
              </a>
              <a href="/policy/refund" style={{ color: '#9ca3af' }}>
                환불정책
              </a>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 960, margin: '0 auto', borderTop: '1px solid #f3f4f6', paddingTop: 20, lineHeight: 1.8 }}>
          <div>운영: 비즈니스 지원센터 (개인용 클론 프로젝트 — 실제 사업자 정보 아님)</div>
          <div>© 2026 슈퍼쇼츠(SuperShorts 클론). All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
