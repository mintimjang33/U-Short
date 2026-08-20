const TOOLS = [
  { name: 'create_shorts', desc: 'URL 또는 직접 대본으로 쇼츠 제작을 요청한다. 로컬 MCP는 즉시 렌더링까지 처리하고, 원격 MCP는 job을 큐에 등록만 한다(실제 렌더링은 PC 워커가 처리).' },
  { name: 'retry_job', desc: '실패한(또는 완료된) job을 같은 설정으로 다시 실행한다.' },
  { name: 'get_job_status', desc: '특정 job의 진행 상태(stage/status/에러/완성된 영상 URL)를 조회한다.' },
  { name: 'upload_asset', desc: '로컬 이미지/영상 파일 또는 원격 URL을 Supabase Storage에 올리고 공개 URL을 돌려준다.' },
  { name: 'list_options', desc: '레이아웃, 자막 프리셋, 음성 페르소나, provider 등 유효한 값 목록을 보여준다.' },
  { name: 'search_naver_news', desc: '네이버 뉴스 검색 오픈API로 최신 이슈/기사를 찾아 쇼츠 소재로 바로 연결한다.' },
  { name: 'get_rows / upsert_row / delete_row', desc: 'projects/jobs/templates 테이블을 직접 조회·수정하는 범용 도구.' },
];

export default function ApiMcpDocsPage() {
  return (
    <div>
      <h1 className="page-title">API / MCP</h1>
      <p className="page-sub">
        Claude 같은 AI 에이전트가 UShort를 직접 조작할 수 있도록, 로컬(stdio)과 원격(HTTP) 두 가지 MCP 서버를 제공해요.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: '28px 0 12px' }}>로컬 MCP (이 PC에서 직접)</h2>
      <div className="card" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: '#9c9cb5', marginBottom: 12 }}>
          이 PC에서 <code>mcp-server/index.js</code>를 stdio로 직접 실행합니다. Next 서버가 켜져 있지 않아도 동작하고,
          렌더링까지 이 프로세스가 직접 처리해요. Claude Desktop / Claude Code의 MCP 설정 파일에 등록하세요.
        </p>
        <pre
          style={{
            background: '#0a0a12',
            border: '1px solid #2a2a3c',
            borderRadius: 10,
            padding: 16,
            fontSize: 12,
            overflowX: 'auto',
            color: '#c4b5fd',
          }}
        >{`{
  "mcpServers": {
    "ushort-local": {
      "command": "node",
      "args": ["C:/Users/user/Downloads/슈퍼쇼츠/mcp-server/index.js"]
    }
  }
}`}</pre>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: '28px 0 12px' }}>원격 MCP (claude.ai 등, 어디서든)</h2>
      <div className="card" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: '#9c9cb5', marginBottom: 12 }}>
          Vercel에 배포된 <code>/api/mcp</code>가 Streamable HTTP MCP 서버로 동작해요. job을 큐에 등록만 하고,
          실제 렌더링은 이 PC에서 상시 실행 중인 워커(<code>워커_시작.bat</code>)가 처리하니 PC가 켜져 있어야 완성됩니다.
        </p>
        <pre
          style={{
            background: '#0a0a12',
            border: '1px solid #2a2a3c',
            borderRadius: 10,
            padding: 16,
            fontSize: 12,
            overflowX: 'auto',
            color: '#c4b5fd',
            wordBreak: 'break-all',
          }}
        >https://u-short-beige.vercel.app/api/mcp?key=&lt;MCP_SHARED_SECRET&gt;</pre>
        <div className="field-hint" style={{ marginTop: 8 }}>
          key 값은 관리자 페이지의 &quot;설정값 확인&quot;에서 MCP_SHARED_SECRET을 눈 버튼으로 열어 복사하세요.
        </div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: '28px 0 12px' }}>제공 도구</h2>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {TOOLS.map((t, i) => (
          <div
            key={t.name}
            style={{
              padding: '14px 18px',
              borderBottom: i < TOOLS.length - 1 ? '1px solid #1c1c2b' : 'none',
            }}
          >
            <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t.name}</div>
            <div style={{ fontSize: 13, color: '#9c9cb5' }}>{t.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
