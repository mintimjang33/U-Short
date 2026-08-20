const PLANS = [
  {
    name: '무료',
    desc: '영상 제작을 체험해보세요',
    price: '무료',
    cta: '무료 시작',
    credits: '3크레딧 · 기본 쇼츠 최대 3개',
    included: ['프로젝트 생성 3회 / 월', 'AI 목소리 3,000자 / 월'],
    features: ['1080p 해상도', '링크 분석', 'AI 대본 생성', '슈퍼쇼츠 워터마크 포함', '모든 템플릿', '프로젝트 30일 보관'],
  },
  {
    name: '라이트',
    desc: '개인 크리에이터를 위한 플랜',
    price: '₩9,900',
    priceSuffix: '/ 월',
    cta: '월간 구독',
    credits: '40크레딧 · 기본 쇼츠 최대 40개',
    included: ['프로젝트 생성 40회 / 월', 'AI 목소리 20,000자 / 월'],
    features: [
      '1080p 해상도',
      '링크 분석',
      'AI 대본 생성',
      '워터마크 제거',
      '모든 템플릿',
      '프로젝트 30일 보관',
      '우선 렌더링',
      '무제한 템플릿 놀이터',
    ],
  },
  {
    name: '프로',
    desc: '본격적인 쇼츠 운영을 위한 플랜',
    price: '₩19,800',
    priceSuffix: '/ 월',
    cta: '월간 구독',
    credits: '100크레딧 · 기본 쇼츠 최대 100개',
    highlight: true,
    included: ['프로젝트 생성 100회 / 월', 'AI 목소리 60,000자 / 월'],
    features: [
      '1080p 해상도',
      '링크 분석',
      'AI 대본 생성',
      '워터마크 제거',
      '모든 템플릿',
      '프로젝트 30일 보관',
      '우선 렌더링',
      '무제한 템플릿 놀이터',
    ],
  },
  {
    name: '맥스',
    desc: '대량 제작과 MCP 자동화 유저를 위한 플랜',
    price: '₩39,600',
    priceSuffix: '/ 월',
    originalPrice: '₩49,500',
    discount: '20% OFF',
    cta: '월간 구독',
    credits: '240크레딧 · 기본 쇼츠 최대 240개',
    included: ['프로젝트 생성 240회 / 월', 'AI 목소리 120,000자 / 월'],
    features: [
      '1080p 해상도',
      '링크 분석',
      'AI 대본 생성',
      '워터마크 제거',
      '모든 템플릿',
      '프로젝트 30일 보관',
      '최우선 렌더링',
      '전용 고객 지원',
      'REST API 및 MCP 연동',
      '무제한 템플릿 놀이터',
    ],
  },
];

const FAQ = [
  {
    q: '무료 플랜은 어떤 기능을 제공하나요?',
    a: '로그인만 하면 매월 프로젝트 생성 3회와 AI목소리 3,000자를 무료로 이용할 수 있으며, 내보낸 결과물에는 슈퍼쇼츠 워터마크가 포함됩니다.',
  },
  { q: '플랜 변경은 언제 적용되나요?', a: '업그레이드는 즉시 적용되며, 다운그레이드는 다음 결제 주기부터 적용됩니다.' },
  { q: '크레딧이 뭔가요?', a: '1프로젝트는 1크레딧입니다. 새 프로젝트를 만들거나 새 버전으로 재생성할 때 1크레딧이 사용됩니다.' },
  {
    q: '프로젝트 생성은 몇 번까지 가능한가요?',
    a: '무료 플랜은 월 3회, 유료 플랜은 월 40~240회까지 새 프로젝트 생성 또는 새 버전 재생성 기준으로 차감됩니다. 이미 생성된 같은 프로젝트의 영상 재생성, 다운로드, 재다운로드는 추가 차감되지 않습니다.',
  },
  { q: '프로젝트 생성 후 수정할 수 있나요?', a: '저장기간 내에는 자유롭게 수정 가능합니다.' },
  { q: '어떤 결제 수단을 지원하나요?', a: '신용카드를 지원합니다. (이 클론에서는 실제 결제 연동 없이 데모로만 표시됩니다.)' },
  {
    q: 'AI 목소리 사용량은 어떻게 차감되나요?',
    a: '최초 AI 목소리 생성은 실제 생성 글자 수의 100%가 차감됩니다. 이후 대본 수정, AI 목소리 재생성, 목소리 변경은 새로 생성되는 글자 수의 50%만 차감하며 소수점은 올림 처리합니다.',
  },
  {
    q: '환불이 가능한가요?',
    a: '결제 후 7일 이내이고 프로젝트 생성, AI 목소리, 링크 분석, AI 대본 생성 사용 이력이 모두 없는 경우에만 환불이 가능합니다. 자세한 사항은 환불 정책을 확인해주세요.',
  },
];

export default function PricingPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <a href="/" style={{ fontSize: 13, color: '#9ca3af' }}>
          ← 돌아가기
        </a>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginTop: 16 }}>
          나에게 맞는 플랜을
          <br />
          지금 시작하세요
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 64 }}>
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className="card"
            style={{
              padding: 24,
              border: plan.highlight ? '2px solid rgb(17,24,39)' : undefined,
              position: 'relative',
            }}
          >
            {plan.highlight && (
              <div
                style={{
                  position: 'absolute',
                  top: -10,
                  left: 20,
                  background: 'rgb(17,24,39)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: 9999,
                }}
              >
                추천
              </div>
            )}
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{plan.name}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16, minHeight: 32 }}>{plan.desc}</div>
            {plan.discount && (
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginBottom: 2 }}>
                {plan.discount} <span style={{ textDecoration: 'line-through', color: '#9ca3af' }}>{plan.originalPrice}</span>
              </div>
            )}
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>
              {plan.price}
              {plan.priceSuffix && <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}> {plan.priceSuffix}</span>}
            </div>
            <a
              href="/login"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '10px 0',
                borderRadius: 9999,
                background: plan.highlight ? 'rgb(17,24,39)' : '#fff',
                color: plan.highlight ? '#fff' : 'rgb(2,8,23)',
                border: plan.highlight ? 'none' : '1px solid #e5e7eb',
                fontWeight: 600,
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {plan.cta}
            </a>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{plan.credits}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {plan.included.map((i) => (
                <div key={i}>· {i}</div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {plan.features.map((f) => (
                <div key={f} style={{ fontSize: 12, color: '#374151' }}>
                  ✓ {f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 32, textAlign: 'center', marginBottom: 64 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 8 }}>ENTERPRISE</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>엔터프라이즈 기업 문의</div>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          슈퍼쇼츠 시스템의 맞춤형 도입이 필요하신가요? 기업 환경에 맞는 구성과 도입 방법을 빠르게 안내해드립니다.
        </p>
        <div style={{ fontSize: 12, color: '#9ca3af' }}>SDK 연동 · 화이트라벨링 · 맞춤형 워크플로</div>
      </div>

      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, textAlign: 'center' }}>자주 묻는 질문</h2>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FAQ.map((item) => (
            <div key={item.q} className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{item.q}</div>
              <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 48, fontSize: 12, color: '#d1d5db' }}>
        <a href="/policy/terms" style={{ color: 'inherit' }}>
          이용약관
        </a>
        {' · '}
        <a href="/policy/refund" style={{ color: 'inherit' }}>
          환불정책
        </a>
      </div>
    </div>
  );
}
