const CONTENT = {
  terms: {
    title: '이용약관',
    body: `제1조 (목적)
이 약관은 UShort(이하 "서비스")가 제공하는 URL 기반 쇼츠 영상 자동 제작 서비스의 이용 조건 및 절차를 규정함을 목적으로 합니다.

제2조 (서비스 이용)
서비스는 이용자 본인의 대본 생성 AI(Claude/Gemini/GPT 중 택1) 및 음성 합성(TTS) API 키를 등록해야 정상적으로 이용할 수 있습니다.
API 사용량, 요금, 할당량 초과 등으로 인한 문제는 각 API 제공사의 정책을 따릅니다.

제3조 (콘텐츠 책임)
이용자가 입력한 URL·직접 작성한 대본을 기반으로 생성된 영상의 저작권 및 콘텐츠 책임은 이용자 본인에게 있습니다.

제4조 (면책)
자동 생성된 대본·자막·음성에는 오류가 포함될 수 있으며, 서비스는 결과물의 정확성을 보장하지 않습니다.

제5조 (약관의 변경)
본 약관은 서비스 운영 방침에 따라 사전 고지 후 변경될 수 있습니다.`,
  },
  privacy: {
    title: '개인정보처리방침',
    body: `1. 수집하는 개인정보
- 이메일 주소 (로그인/계정 식별용)
- 대본 생성 AI / TTS API 키 (이용자가 직접 입력, 서버에만 저장되며 클라이언트에 노출되지 않음)

2. 개인정보의 이용 목적
로그인 인증 및 서비스 제공을 위한 목적으로만 사용하며, 제3자에게 제공하지 않습니다.

3. 개인정보의 보관
계정 정보는 인증 시스템(Supabase Auth)에 안전하게 저장되며, 제작한 프로젝트·영상 등 이용 데이터는 회원별로 분리되어 관리됩니다.

4. 문의
개인정보 관련 문의는 고객센터를 통해 접수해 주세요.`,
  },
  refund: {
    title: '환불정책',
    body: `1. 환불 원칙
프리미엄 구독은 결제 후 7일 이내 서비스를 이용하지 않은 경우 전액 환불이 가능합니다.

2. 환불 절차
구독 관리 페이지에서 해지 요청 후 고객센터로 문의해 주시면 영업일 기준 3~5일 내 처리됩니다.

3. 환불 제한
정기결제 주기가 이미 시작되어 서비스를 이용한 경우, 이용 기간에 대해서는 환불이 제한될 수 있습니다.`,
  },
};

export default async function PolicyPage({ params }) {
  const { slug } = await params;
  const data = CONTENT[slug] ?? CONTENT.terms;

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
      <a href="/" style={{ fontSize: 13, color: '#9c9cb5' }}>
        ← 돌아가기
      </a>
      <div className="card" style={{ marginTop: 16, padding: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>{data.title}</h1>
        <div style={{ fontSize: 14, color: '#c7c7d9', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{data.body}</div>
      </div>
    </div>
  );
}
