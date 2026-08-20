import { getCurrentUser } from '../lib/supabaseServerAuth.js';
import { HeroShortsPreview, ShortsMockupCard, SAMPLES } from './components/HeroShortsPreview.jsx';

const scriptTypes = [
  { n: 1, label: '핵심 요약형 대본' },
  { n: 2, label: '후킹 강조형 대본' },
  { n: 3, label: '정보 나열형 대본' },
];

const GRADIENT = 'linear-gradient(135deg, #fb923c, #ec4899, #8b5cf6)';
const GRADIENT_TEXT = 'linear-gradient(135deg, #fdba74, #f472b6, #a78bfa)';

export default async function LandingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? '/dashboard' : '/login';
  const headerLabel = user ? '대시보드로 이동' : '로그인';
  const heroLabel = user ? '대시보드로 이동' : '무료로 시작하기';

  return (
    <div>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 32px',
          borderBottom: '1px solid #22222f',
        }}
      >
        <a href="/" aria-label="UShort 홈" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: 18,
              backgroundImage: GRADIENT_TEXT,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            ⚡ UShort
          </span>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 14, color: '#9c9cb5' }}>
          <a href="#preview" style={{ color: 'inherit' }}>
            쇼츠 둘러보기
          </a>
          <a href="/pricing" style={{ color: 'inherit' }}>
            가격 안내
          </a>
          <a href="/blog" style={{ color: 'inherit' }}>
            블로그
          </a>
          <a href="/notices" style={{ color: 'inherit' }}>
            공지사항
          </a>
        </nav>
        <a
          href={ctaHref}
          style={{
            height: 36,
            padding: '0 20px',
            borderRadius: 9999,
            backgroundImage: GRADIENT,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {headerLabel}
        </a>
      </header>

      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 64,
          padding: '96px 24px 64px',
          maxWidth: 1120,
          margin: '0 auto',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ textAlign: 'left', maxWidth: 560 }}>
          <div
            style={{
              display: 'inline-block',
              fontSize: 13,
              color: '#c4b5fd',
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: 9999,
              padding: '6px 16px',
              marginBottom: 24,
            }}
          >
            크리에이터가 선택한 AI 자동 쇼츠 제작 생성기
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.25, marginBottom: 20 }}>
            <span
              style={{
                backgroundImage: GRADIENT_TEXT,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              UShort,
            </span>
            <br />
            URL로 쇼츠를
            <br />
            1분 자동 제작
          </h1>
          <p style={{ fontSize: 16, color: '#9c9cb5', marginBottom: 32, lineHeight: 1.6 }}>
            대본, 자막, 목소리까지
            <br />
            UShort로 빠르고 쉽게 해결해 보세요.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <a
              href={ctaHref}
              style={{
                padding: '12px 28px',
                borderRadius: 9999,
                backgroundImage: GRADIENT,
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {heroLabel}
            </a>
            <a
              href="#preview"
              style={{
                padding: '12px 28px',
                borderRadius: 9999,
                border: '1px solid #2a2a3c',
                background: '#14141f',
                color: '#f4f4f8',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              샘플 보기
            </a>
          </div>
        </div>

        <HeroShortsPreview />
      </section>

      <section id="preview" className="card" style={{ maxWidth: 760, margin: '0 auto 64px', padding: 40 }}>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#9c9cb5', fontWeight: 700, marginBottom: 24 }}>
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
                background: '#1c1c2b',
                fontSize: 13,
                color: '#f4f4f8',
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundImage: GRADIENT,
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

      <section style={{ textAlign: 'center', padding: '48px 24px', background: '#0e0e17' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>지금도 쌓이는 유저들의 쇼츠</h2>
        <p style={{ color: '#9c9cb5', marginBottom: 32 }}>
          블로거·크리에이터가 만든 쇼츠가 끊임없이 만들어지고 있어요.
        </p>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
          {SAMPLES.map((s, i) => (
            <ShortsMockupCard key={i} sample={s} width={180} />
          ))}
        </div>
        <a
          href={ctaHref}
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            borderRadius: 9999,
            border: '1px solid #2a2a3c',
            background: '#14141f',
            color: '#f4f4f8',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          나도 만들어 보기
        </a>
      </section>

      <section style={{ textAlign: 'center', padding: '64px 24px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>실제 폰에서 보는 것처럼, 세로 피드</h2>
        <p style={{ color: '#9c9cb5', marginBottom: 32 }}>
          릴스·쇼츠처럼 세로 9:16 그대로, 폰에서 보던 느낌으로 재생돼요.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <ShortsMockupCard sample={SAMPLES[3]} width={300} />
        </div>
        <a
          href={ctaHref}
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            borderRadius: 9999,
            backgroundImage: GRADIENT,
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          나도 만들어 보기
        </a>
      </section>

      <footer style={{ borderTop: '1px solid #22222f', padding: '48px 32px', fontSize: 13, color: '#9c9cb5' }}>
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
            <div
              style={{
                fontWeight: 800,
                marginBottom: 8,
                backgroundImage: GRADIENT_TEXT,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              ⚡ UShort
            </div>
            <div>URL로 쇼츠를 자동 제작하는 AI 숏폼 영상 서비스</div>
            <div style={{ marginTop: 4 }}>URL 하나만으로 쇼츠를 만들어보세요</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#f4f4f8', marginBottom: 8 }}>서비스</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a href={ctaHref} style={{ color: '#9c9cb5' }}>
                새로 제작
              </a>
              <a href="/pricing" style={{ color: '#9c9cb5' }}>
                가격 안내
              </a>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#f4f4f8', marginBottom: 8 }}>지원</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>문의하기</span>
              <span>팀 소개</span>
              <a href="/notices" style={{ color: '#9c9cb5' }}>
                공지사항
              </a>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#f4f4f8', marginBottom: 8 }}>법적 정보</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a href="/policy/terms" style={{ color: '#9c9cb5' }}>
                이용약관
              </a>
              <a href="/policy/privacy" style={{ color: '#9c9cb5' }}>
                개인정보처리방침
              </a>
              <a href="/policy/refund" style={{ color: '#9c9cb5' }}>
                환불정책
              </a>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 960, margin: '0 auto', borderTop: '1px solid #1c1c2b', paddingTop: 20, lineHeight: 1.8 }}>
          <div>상호명: 비즈니스 지원센터</div>
          <div>© 2026 UShort. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
