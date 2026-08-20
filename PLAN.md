# 슈퍼쇼츠 클론 — 계획 & 진행 상황 (Handoff 문서)

> 이 문서는 **이 대화를 기억 못 하는 새 Claude 세션이 읽어도 이어서 작업할 수 있도록** 쓴 것.
> "지금 뭐가 됐고, 뭐가 안 됐고, 다음에 뭘 해야 하는지"를 최신 상태로 유지할 것.
> 코드를 크게 바꿀 때마다 이 문서의 "현재 상태" 섹션을 같이 업데이트해라.

## 프로젝트가 뭔지 (배경)

supershorts.co.kr(블로그 URL → AI가 대본·음성·자막 붙여서 9:16 세로 쇼츠 영상 자동 제작하는 서비스)을
사용자가 실제 로그인해서 써보고 "이거 나도 만들어보고 싶다"고 해서 시작한 프로젝트.

**요구사항 (사용자가 대화 중 확정한 것들, 전부 반영됨):**
1. 회원가입/결제 없이, **혼자 쓸 로컬 도구**로 만들되 실제 사이트와 최대한 비슷하게 (레이아웃/템플릿 커스터마이징/자막 프리셋/새 프로젝트 옵션 다 있어야 함)
2. **서버를 직접 운영하지 않아도 됨** — `npm run dev`로 내 PC에서 돌리고, DB/파일저장은 Supabase(관리형)
3. **나중에 진짜 SaaS로 키울 수도 있으니**, 로그인/결제 붙이기 쉽게 스키마를 미리 대비해둘 것 (user_id 컬럼 nullable로 이미 넣어둠, RLS 정책은 주석 처리된 채로 schema.sql에 있음 — 켜기만 하면 됨)
4. **대충 만들지 말 것** — API 키 없이도 검증 가능한 부분(스크래핑, 자막타이밍, 렌더링, 빌드)은 실제로 돌려서 확인
5. 대본 생성 AI와 TTS는 **여러 provider 중에 고를 수 있게** (아래 "AI Provider 선택지" 참고)

## 실사이트 조사로 확정된 사양

`/templates` 5개 탭(제목/부가정보/레이아웃/배경/자막) 전부, `/business` API 콘솔 4개 서브페이지,
`/business/docs` API 문서 전체를 로그인 계정으로 직접 열어보고 확인함:

- **레이아웃 4종**: 정보(상단 이미지+하단 검은 자막바) / 전체화면 / 바이럴민트(인물) / 카드형(정적 사진+캡션)
  → 이 중 **정보·카드형 2종만 구현함** (바이럴민트는 인물 영상 필요해서 블로그 자동화 취지와 안 맞아 제외)
- **자막 18개 프리셋** (kebab-case ID, 예: `existing-preset-bold-white-outline`) → **6종만 재현함** (`remotion/src/captionPresets.js`)
- **Job API 스키마** (`url, sourceText, imageInventory[], planningMode, variantCount, lengthMode, template, contentTemplateId, introEnabled, introTemplateId, introDisplayOnly, voice`) → 우리 DB `projects.options` jsonb 필드에 최대한 같은 개념으로 반영
- **Job 라이프사이클**: `queued → processing(stage별) → completed/failed` → 우리 `jobs` 테이블도 동일 구조

## AI Provider 선택지 (전부 구현됨, 대화 중 여러 번 바뀐 결정이니 이유 꼭 읽을 것)

### 대본 생성 (`lib/generateScript.js`, `SCRIPT_PROVIDER` 환경변수)
- `claude` (기본) — Anthropic API
- `gemini` — 무료 티어 있어서 연습용으로 좋음 (Flash 모델, 2026-08 기준 `gemini-2.5-flash`)
- `gpt` — OpenAI (`gpt-4o-mini`)

셋 다 같은 시스템 프롬프트를 쓰고, JSON `{titleLine1, titleLine2, narration}` 형식으로 강제함.

### 음성 합성 (`lib/generateVoice.js`, `TTS_PROVIDER` 환경변수)
- `fal` (**기본값**) — 사용자가 이미 FAL_KEY를 갖고 있어서 기본으로 설정. `fal-ai/elevenlabs/tts/eleven-v3` 엔드포인트로 ElevenLabs 보이스를 fal 계정으로 그대로 호출. 고정 월정액 없음(쓴 만큼만 과금).
- `elevenlabs` — 무료 티어 월 10,000자, 연습용으로 좋음. 자체 ElevenLabs 계정 필요.
- `clova` — Naver CLOVA Voice Premium. **실제 확인한 요금: 월 기본료 90,000원(사용량 0이어도 고정) + 100만자까지 포함 + 초과분 1,000자당 100원.** 개인 용도로는 비효율적이라 기본값에서 제외, 대량 운영시에만 고려.

⚠️ **처음에 Naver CLOVA를 기본값으로 잘못 골랐다가, 요금을 실제로 확인해보고 fal로 바꾼 히스토리가 있음.**
비슷한 실수(추측으로 기본값 정하기) 반복하지 말고, 새 provider 추가할 땐 실제 요금 페이지를 확인할 것.

## 현재 상태 (마지막 업데이트: 1차 완성 + 사용자 요청으로 갭 9개 전부 보완 완료)

최초 MVP를 만든 뒤, 사용자가 "혹시 구현 안 한 부분 솔직하게 말해줘"라고 물어서 9개 갭을 정직하게 보고했고,
"다 하나씩 체크해서 업데이트해줘, 번거롭더라도 꼼꼼하게"라는 요청으로 전부 보완함. 그 갭들과 처리 결과:

1. ~~UI를 브라우저로 확인한 적 없음~~ → `npm run dev`로 실제 띄워서 `/new`, `/templates` 클릭 테스트 완료 (아래 참고)
2. ~~"직접 대본 작성" 경로 없음~~ → `/new`에 소스 선택(링크/직접작성) 탭 추가, `planningMode: direct` 연결 완료
3. ~~카드형 레이아웃에 부가정보 안 붙음~~ → `CardLayout.jsx`에 extraInfo 렌더링 추가
4. ~~저장한 템플릿 불러오기 안 됨~~ → 템플릿 에디터에 불러오기/업데이트/삭제 추가, `/new`에도 템플릿 선택 드롭다운 추가
5. ~~이미지 업로드가 URL 붙여넣기뿐~~ → `POST /api/upload`(Supabase Storage 업로드) 추가, `/new`에 파일 업로드 인풋 연결
6. ~~실패 job 재시도 버튼 없음~~ → `POST /api/jobs/[id]/retry` + `/projects/[id]` 화면에 재시도 버튼 추가
7. ~~프로젝트/템플릿 삭제 안 됨~~ → `DELETE /api/projects/[id]`(Storage 파일도 같이 정리), `DELETE /api/templates/[id]` 추가
8. ~~자막 타이밍이 근사치~~ → `lib/transcribeTimestamps.js` 추가: alignment 없는 provider(fal/Clova)는 fal.ai Whisper(`chunk_level: word`)로 실제 단어 타이밍을 다시 뽑고, 그것도 실패하면 글자수 비례 근사치로 폴백 (3단계 우선순위)
9. ~~크레딧 필드가 장식~~ → 대시보드에 "완료된 영상 수 / 누적 사용 크레딧" 통계 카드 추가 (실제 과금 집행은 아니고 기록용이라고 정직하게 라벨링)

추가로 사용자가 요청한 것: **프로젝트 전용 MCP 서버** (`mcp-server/`) — 아래 별도 섹션 참고.

### ✅ 실제로 돌려서 검증한 것
- `lib/extract.js` — 실제 네이버 블로그 URL로 직접 실행, 본문/이미지 정상 추출 확인 (지도 이미지 필터링 버그도 발견해서 고침)
- `lib/buildCaptions.js` — alignment / words(Whisper) / 균등분배 3개 경로 + 에러 케이스 전부 유닛 테스트 통과 (`scripts/test-captions.js`)
- `lib/render.js` + `remotion/src/layouts/*` — 더미 데이터로 InfoLayout·CardLayout 둘 다 실제 mp4 렌더링 성공, 사용자에게 파일 전달함
- `npm run build` — 여러 차례 재검증, 전부 통과 (아래 "발견해서 고친 버그" 참고)
- **`npm run dev`로 실제 브라우저 테스트**: `/`(대시보드), `/new`, `/templates` 전부 열어서 확인. `/templates`에서 `@remotion/player`가 실제로 프레임을 그리며 재생되는 것(재생 타임코드, 캡션이 시간에 따라 바뀌는 것)까지 직접 확인함. `/new`의 "직접 대본 작성" 탭 클릭 시 입력창이 실제로 바뀌는 것도 확인.
- **이 브라우저 테스트 중 실제 버그 하나를 발견해서 고침**: `.env.local` 없이 `/api/templates`를 호출하면 `getSupabaseServerClient()`가 던지는 에러가 API 라우트 안에서 안 잡혀서 Next.js 기본 에러 처리로 새어나가고, 그 응답이 유효한 JSON이 아니어서 브라우저에서 `"Unexpected end of JSON input"` 크래시가 났음. `lib/apiHandler.js`(`withApiErrorHandling`)를 만들어서 **모든 API 라우트 핸들러(jobs/projects/templates/upload 전부)를 감싸 어떤 에러든 항상 `{error: string}` JSON으로 내려가게 고침.**
- **MCP 서버 프로토콜 레벨 검증**: 실제 JSON-RPC로 `initialize` → `tools/list` → `tools/call`까지 stdio로 주고받아서 7개 도구가 전부 정상 등록/응답하는 것 확인 (더미 Supabase URL로, 실제 DB 연결은 미검증)

### ⚠️ 여전히 실행 검증 못 한 것 (API 키/실제 Supabase가 없어서 — Docker도 없어서 로컬 Postgres도 못 띄움)
- `lib/generateScript.js` — Claude/Gemini/GPT 세 경로 다 실제 API 호출 안 해봄. 특히 Gemini/GPT 응답 파싱 경로는 문서 기준으로만 작성 — **키 넣고 처음 돌릴 때 실제 응답 구조 확인 필수**.
- `lib/generateVoice.js` — fal/ElevenLabs/Clova 세 경로 다 마찬가지.
- `lib/transcribeTimestamps.js` — fal Whisper 호출도 실제 오디오로 실행 검증 못 함 (테스트용 오디오가 무음이라 애초에 단어 인식이 안 됨).
- Supabase 연동 전체(`schema.sql` 실행 여부, RPC 함수 `exec_readonly_sql` 문법, `jobs`/`templates`/`projects` 테이블 실제 CRUD 왕복) — SQL 문법은 눈으로 검토했고 API 라우트 로직도 코드 리뷰는 했지만, 진짜 Postgres에 붙여본 적은 없음.
- 이미지 업로드(`/api/upload`)도 실제 Storage 버킷 없이는 성공 여부 확인 불가.

### 발견해서 고친 실제 버그 (기록용, 최신순)
1. **API 라우트 에러가 깨진 JSON으로 샘** — 위 "실제로 돌려서 검증한 것" 참고, `lib/apiHandler.js`로 해결.
2. `@remotion/bundler`/`@remotion/renderer`를 Next.js API 라우트에서 import하면 Next의 webpack이 Remotion 내부 번들러(rspack 네이티브 바이너리, esbuild 타입파일)까지 번들링하려다 깨짐 → `next.config.js`에 `serverExternalPackages`로 제외 처리.
3. `@remotion/player`의 `<Player>`가 SSR(빌드타임 프리렌더링)에서 `useRef` 에러로 깨짐 → `app/templates/page.js`를 `next/dynamic`(`ssr:false`)으로 감싸고 실제 내용은 `TemplateEditorInner.jsx`로 분리.
4. Remotion 서버사이드 렌더링은 **로컬 파일 경로(file://)를 에셋으로 못 읽는다** — `<Audio src>`/`<Img src>`는 반드시 http(s) URL이어야 함. 그래서 파이프라인은 TTS 음성을 렌더링 전에 먼저 Supabase Storage에 업로드해 공개 URL을 받은 뒤 Remotion에 넘기는 구조.
   **교훈: Remotion 관련 코드를 새로 추가/수정할 때마다 이 네 가지 함정을 기억할 것.**

## MCP 서버 (`mcp-server/`) — 사용자 요청으로 추가, v0.2에서 "실제 작업 수행"으로 확장

처음엔 프레시시즌 패턴(범용 테이블 CRUD + 읽기전용 run_sql)만 따라 만들었는데, 사용자가 "니가 언제든
쇼츠메이커에 접속해서 내 대신 작업할 수 있게"라고 요청해서 — 프레시시즌의 진짜 핵심 패턴이
`create_blog_post`처럼 **실제 작업을 한 번에 끝내는 도구**라는 걸 다시 보고, 같은 방향으로 확장함.

**핵심: `create_shorts` 도구가 Next.js 개발 서버 없이도 파이프라인을 직접 실행한다.**
`mcp-server/index.js`가 `lib/pipeline.js`의 `runPipeline()`을 동적 import로 직접 불러와서 실행하기 때문 —
Node의 상대경로 import는 파일 위치 기준으로 node_modules를 찾으므로 `@remotion/*`, `@anthropic-ai/sdk` 등
프로젝트 루트 `node_modules`의 무거운 의존성도 mcp-server 프로세스 안에서 그대로 resolve된다
(실제로 격리된 임포트 테스트로 10개 lib 모듈 전부 정상 로드 확인함).

- 위치: `mcp-server/index.js` (별도 `package.json`, `@modelcontextprotocol/sdk` 사용)
- 등록: `Downloads/.mcp.json`에 `"supershorts-clone"` 이름으로 등록됨 (`node ./슈퍼쇼츠/mcp-server/index.js`)
- **실제 작업 도구 5개** (신규):
  - `create_shorts` — URL 또는 직접 대본으로 쇼츠를 처음부터 끝까지(추출→대본→음성→자막→렌더링→업로드) 실제로 만든다. `wait:true`(기본)면 완료까지 기다렸다가 영상 URL을 바로 반환.
  - `retry_job` — 실패한 job을 같은 설정으로 재실행 (이제 Next 서버 없이 이 서버가 직접 처리, 이전 버전은 HTTP 프록시 방식이었으나 폐기)
  - `get_job_status` — job 진행 상태/완성 영상 URL 조회
  - `upload_asset` — 로컬 파일 또는 원격 URL 이미지를 Storage에 올려서 배경 이미지로 쓸 공개 URL 획득
  - `list_options` — 레이아웃/자막프리셋/AI provider 등 유효한 값 목록 (`lib/options.js` 재사용)
- **범용 DB 도구 6개** (기존): `list_tables`, `get_rows`, `upsert_row`, `delete_row`, `run_sql`(SELECT만, `exec_readonly_sql` RPC), `list_projects_summary`
- `.env.local`을 직접 읽어서 접속하므로, Next.js 앱과 별도로 `mcp-server/`에서 `npm install` 한 번 필요 (이미 해둠)
- **검증**: (1) `lib/*.js` 10개 모듈을 mcp-server에서 격리 import하는 테스트로 전부 정상 로드 확인 (2) 실제 JSON-RPC로 initialize/tools-list(11개 도구 스키마 전부 정상) 확인 (3) 네트워크 안 쓰는 `list_options` 실제 tools/call로 `lib/options.js` 데이터가 정확히 나오는 것까지 확인. `create_shorts`/`get_job_status` 등 Supabase를 실제로 왕복하는 도구는 진짜 프로젝트가 없어 실행 검증은 못 함 (더미 URL로 호출하면 DNS/연결 자체가 오래 걸려 타임아웃남 — 이건 버그가 아니라 가짜 URL이라 당연한 현상).
  - 참고: 이 환경(Windows) 자체가 가끔 스크립트 첫 실행이 십수~수십 초씩 걸리는 간헐적 지연이 있었음(아마 백신 실시간 검사) — 같은 명령을 재시도하면 정상 동작했으니, 실제 사용 중 첫 호출이 느리게 느껴져도 코드 문제가 아닐 수 있음.

## GitHub 저장소 (2026-08-20 추가)

`https://github.com/mintimjang33/U-Short` (main 브랜치)에 push되어 있음.
**이 PC에서 GitHub push/curl -u 인증이 조용히 실패하는 환경 문제가 있었고 해결책을 찾아뒀다 — 다시 push해야 하면 코드부터 의심하지 말고 [`GITHUB_PUSH.md`](./GITHUB_PUSH.md)부터 읽을 것.**
요약: `-u user:token`이나 URL에 토큰을 넣는 일반적인 방식은 이 환경에서 Authorization 헤더가 전송되지 않아 전부 실패했고(SSPI 관련 추정), `git -c http.extraHeader="Authorization: Basic <base64>"` 방식만 성공했다.

## 파일 지도

```
슈퍼쇼츠/
├── PLAN.md, README.md              ← 사람이 읽는 문서
├── GITHUB_PUSH.md                  ← push 인증 문제 겪으면 이것부터 읽을 것 (위 섹션 참고)
├── package.json, next.config.js, remotion.config.js
├── .env.local.example              ← 필요한 키 전부 여기 정리돼 있음 (아직 실제 .env.local은 없음)
├── supabase/schema.sql             ← 미실행 상태. exec_readonly_sql RPC 함수 포함
├── scripts/                        ← 검증용 스크립트 (test-extract/test-captions/test-render)
├── mcp-server/                     ← 이 프로젝트 전용 MCP 서버 (별도 package.json)
├── lib/
│   ├── options.js                  화면과 API가 공유하는 선택지 목록
│   ├── supabase.js                 서버 전용 클라이언트 (service role)
│   ├── apiHandler.js               모든 API 라우트를 감싸는 에러 핸들러 (신규)
│   ├── extract.js   ✅검증됨
│   ├── generateScript.js  ⚠️미검증 (claude/gemini/gpt)
│   ├── generateVoice.js   ⚠️미검증 (fal/elevenlabs/clova)
│   ├── transcribeTimestamps.js  ⚠️미검증 (fal Whisper, 신규)
│   ├── buildCaptions.js   ✅검증됨 (alignment/words/균등분배 3경로)
│   ├── render.js    ✅검증됨
│   └── pipeline.js         ← 위 여섯 개를 순서대로 엮는 오케스트레이터, jobs 테이블 갱신
├── remotion/src/
│   ├── Root.jsx, index.js          Composition 2개 등록 (InfoLayout/CardLayout)
│   ├── captionPresets.js, CaptionText.jsx, useCurrentCaption.js
│   └── layouts/InfoLayout.jsx, CardLayout.jsx   ✅둘 다 실제 렌더 검증됨, 둘 다 extraInfo 지원
└── app/
    ├── layout.js, globals.css, page.js(대시보드, 크레딧 통계 카드 포함)
    ├── new/page.js                 새 프로젝트 폼 — 소스(링크/직접작성), 템플릿 불러오기, 이미지 업로드 전부 포함
    ├── templates/page.js(dynamic ssr:false) + TemplateEditorInner.jsx   템플릿 에디터 (불러오기/업데이트/삭제)
    ├── projects/[id]/page.js       진행상황 폴링 + 재시도 + 삭제
    └── api/
        ├── jobs/route.js, jobs/[id]/retry/route.js
        ├── projects/route.js, projects/[id]/route.js
        ├── templates/route.js, templates/[id]/route.js
        └── upload/route.js
```

## 로그인 / 관리자 / 약관 / Vercel 배포 (2026-08-20 추가)

사용자가 "슈퍼파인더처럼 나중에 판매용으로도 키울 거니, 데모 말고 처음부터 다 구현해두자"고 요청해서 진행함.

- **로그인**: Supabase Auth 이메일/비번 + 구글 OAuth 실제 구현·검증 완료 (`lib/supabaseBrowser.js`, `lib/supabaseServerAuth.js`, `middleware.js`, `app/login/page.js`, `app/auth/callback/route.js`). 미들웨어가 비로그인 접근을 `/login`으로 리다이렉트(`/login`, `/auth/callback`, `/policy/*`, `/api/*`는 예외).
  - 구글 OAuth: Google Cloud Console에서 OAuth 클라이언트 발급 + Supabase Auth Providers에 Client ID/Secret 등록까지 완료, 브라우저로 실제 구글 로그인 화면까지 리다이렉트되는 것 확인함(계정 로그인 자체는 사용자 개인 계정이라 미완주).
- **관리자 페이지**: `app/(app)/admin/page.js` + `app/api/admin-users/route.js`. `.env.local`의 `OWNER_EMAIL`(mintimjang33@gmail.com)로 로그인해야만 보이고, `supabase.auth.admin.listUsers()`로 가입회원 목록 조회.
- **약관**: `app/policy/[slug]/page.js` — terms/privacy/refund 3종, 슈퍼파인더 Policy.tsx와 같은 구성으로 새로 작성(원본 그대로 복사 아님).
- **user_id 연결**: 프로젝트/템플릿 생성 시 로그인한 사용자의 id를 저장, 목록 조회도 본인 것만 필터링. RLS 정책도 `schema.sql`에 실제로 켜둠(단, API 라우트는 항상 service_role로 접속해 RLS를 우회하므로 지금 당장 필수는 아니고 나중에 브라우저 직접조회 대비용).
- **라우트 구조 변경**: 로그인 게이트가 필요 없는 `/login`, `/policy/*`를 뺀 나머지 페이지들을 `app/(app)/` 라우트그룹으로 옮김(사이드바+로그아웃 버튼은 `app/(app)/layout.js`에만 있음). 상대경로 import가 한 단계씩 밀린 걸 다 잡아서 `npm run build` 통과 확인함.

### Vercel 배포용 아키텍처 분리 (진행중)

사용자가 "PC가 렌더링은 직접 하되, 접속은 아무 데서나 되게 하고 싶다"고 요청 — 슈퍼파인더의 remote MCP와 같은 방향.
Vercel 서버리스 함수는 실행시간 제한 때문에 Remotion 렌더링을 못 돌리므로(계속 논의된 제약), 이렇게 분리함:

- `app/api/jobs/route.js`(POST), `app/api/jobs/[id]/retry/route.js`: 이제 `runPipeline()`을 직접 호출하지 않고 job을 `queued` 상태로 DB에 넣기만 하고 끝남 (Vercel에 올려도 시간제한에 안 걸림).
- `scripts/worker.js`(신규): 이 PC에서 계속 켜둬야 하는 폴링 프로세스. 5초마다 Supabase `jobs` 테이블에서 `queued` job을 찾아 실제로 `runPipeline()`을 실행함. `npm run worker`로 실행.
- `app/`(Next.js 전체)는 이제 `lib/pipeline.js`/`lib/render.js`(무거운 Remotion 렌더러)를 전혀 import하지 않음 — `mcp-server/index.js`와 `scripts/worker.js`만 import함. 그래서 Vercel 배포본에 무거운 렌더링 코드가 안 딸려감.
- **주의**: `scripts/worker.js`를 안 켜두면 Vercel에서 새 프로젝트를 만들어도 영원히 "대기중" 상태로 남는다. 로컬에서 `npm run dev`로 직접 쓸 때도 이제 워커를 따로 켜야 함(예전처럼 API가 바로 렌더링 안 함).

## 브랜드 변경 + 배포 완료 + 뉴스/유튜브 지원 조사 (2026-08-20 추가)

- **브랜드**: "슈퍼쇼츠" → **"UShort"**로 전면 변경, 디자인도 라이트 흑백 미니멀 → **다크모드 + 오렌지/핑크/바이올렛 그라디언트**로 완전히 새로 감(슈퍼파인더의 violet/indigo 플랫컬러와 겹치지 않게 의도적으로 다르게). `app/globals.css`에 `--grad` CSS 변수로 정의. 마케팅 카피의 "블로그 URL" 표현도 "URL"로 일반화(블로그 전용이 아니라 뉴스 등도 지원한다는 걸 반영).
- **실제 배포 완료**: GitHub(`mintimjang33/U-Short`) → Vercel(`https://u-short-beige.vercel.app`) 배포 성공, 구글 로그인까지 실제 로그인 테스트로 확인됨. 원격 MCP(`pages/api/mcp.js`)도 `https://u-short-beige.vercel.app/api/mcp?key=ushort_admin_2026`로 claude.ai 커넥터 연결 가능(단, `create_shorts`는 job을 queued로 넣기만 함 — 실제 렌더링은 여전히 PC의 `npm run worker`가 담당).
  - 배포 중 발견해서 고친 버그: 미들웨어가 `/.well-known/*` 경로까지 로그인 페이지로 리다이렉트시켜서 claude.ai가 이걸 OAuth 서버로 오인, DCR(동적 클라이언트 등록)을 시도하다 연결 실패하는 문제 있었음 → matcher에서 `.well-known` 제외해서 해결.
- **뉴스 지원 조사 완료**: 네이버뉴스 실제 기사 URL로 테스트해보니, 기존 `lib/extract.js`의 범용 Readability 경로가 **이미 잘 작동함**(네이버뉴스 전용 `#dic_area` 셀렉터로 뽑은 것과 거의 동일한 품질, 1147자 vs 1154자) — **전용 파서 추가 불필요**. `scripts/test-news-pipeline.js`로 실제 뉴스 URL(`n.news.naver.com`) → 완성 영상까지 end-to-end 검증 완료.
- **유튜브 자막 지원은 여전히 막혀있음**: 자막 트랙 URL을 페이지에서 직접 추출해 브라우저 헤더까지 흉내내서 요청해도 200 OK에 0바이트 — 유튜브가 PO 토큰(브라우저 진위 증명)을 요구하는 것으로 확인(슈퍼파인더 때와 동일 증상, 직접 재검증함). 세 가지 선택지 논의됨: (1) 자막 없이 제목+설명만으로 대본 생성(당장 가능, 품질 얕음) (2) `youtubei.js` 등 PO 토큰 우회 라이브러리 도입(검증 필요) (3) Puppeteer 헤드리스 브라우저(무거움). **아직 미착수, 다음 세션에서 이어갈 것.**

## 자막 정렬 버그 + 레이아웃/프리셋 확장 (2026-08-20 추가)

- **버그 수정**: `CaptionText.jsx`에서 `textAlign: center`가 inline `<span>`에 있어서(자기 자신의 줄바꿈에는 효과 없음) 자막이 2줄 이상일 때 왼쪽 정렬처럼 보이던 버그. `text-align`을 바깥 block-level `div`로 옮겨서 수정, 실제 렌더링(2줄 캡션)으로 확인함.
- **자막 프리셋 8종 완성**: 실사이트 API 문서(`supershorts.co.kr/business/docs`, 로그인 불필요, `introTemplateId` 표)에서 "기존 프리셋" 전체 8종을 확인함 — 기존 6종에 `existing-preset-pink-rounded`(핑크 라운드), `existing-preset-black-pill`(블랙 알약) 2종 추가.
- **레이아웃 3종 추가**: 같은 API 문서의 `contentTemplateId` 표에서 5개 기본 레이아웃(`base-*`)을 확인함 — **44개 "콘텐츠 템플릿"은 실제로는 5개 레이아웃을 재사용하는 39개 예시 주제 갤러리였음** (레이아웃 자체가 44종이 아님, 오해하기 쉬운 부분이니 주의). 기존 2종(정보/카드형)에 이어 3종 신규 구현:
  - `full-focused`(풀레이아웃): 이미지 풀스크린 + 하단 자막 오버레이
  - `image-dark`(정보성 다크): InfoLayout과 같은 2분할 구조지만 하단이 다크 그라디언트
  - `viral-mint`(바이럴민트): 사용자가 요청("추가해두고 필요할 때 사용하면 되잖아")해서 포함 — 실제 인물 영상은 자동 생성 안 하고, **사용자가 직접 업로드한 영상**(`backgroundVideoUrl`)을 배경으로 재생하는 구조로 구현. `app/api/upload/route.js`가 이제 영상(mp4/webm/mov, 최대 100MB)도 받고, Supabase Storage `shorts` 버킷의 `file_size_limit`도 100MB로 올림.
  - `lib/pipeline.js`가 `layout_id`로 컴포지션을 찾을 때 하드코딩된 삼항연산자 대신 `LAYOUTS` 배열 조회로 바뀜 — 새 레이아웃 추가할 때 `lib/options.js`만 고치면 됨.
  - 로컬/원격 MCP(`mcp-server/index.js`, `pages/api/mcp.js`) 둘 다 `layoutId` enum과 `backgroundVideoUrl` 파라미터 추가 완료.
- 이 API 문서에서 추가로 확인된 것(아직 미착수): **인트로보드 10종**(`introTemplateId` 1~10번, 자막 프리셋과 별개), **음성 23종**(한국어11/일본어3/영어7/기타2 — 우리는 fal/ElevenLabs 자체 보이스라 이름 그대로 매칭은 안 되고, 페르소나 개념만 참고해서 만들어야 함).

## 인트로보드 + 자동화 기본값 + 템플릿 갤러리 + 네이버뉴스 검색 MCP (2026-08-20 추가)

- **인트로보드 10종 구현 완료**: `remotion/src/introPresets.js`(신규, 실사이트 `introTemplateId` 1~10번 값 그대로), `IntroBoard.jsx`(신규, 프리셋 스타일로 타이틀 화면만 보여줌), `withIntro.jsx`(신규, Remotion `<Sequence>`로 각 레이아웃 앞에 1.8초 인트로 붙이는 HOC). `Root.jsx`가 5개 레이아웃 전부를 `withIntro()`로 감싸도록 리팩터됨, `calculateMetadata`가 `introEnabled`일 때 총 길이에 인트로 시간을 더함.
- **자동화 기본값 설정 페이지 신규**: `app/(app)/settings/page.js` — 레이아웃/자막프리셋/인트로/스타일/언어/길이/대본provider/음성provider를 사용자별로 미리 지정해두면(`automation_defaults` 테이블) 이후 `create_shorts`(MCP)나 `/new`에서 값을 안 넣어도 자동 적용됨(비워두면 "매번 직접 선택"). `app/api/automation-defaults/route.js`(GET/PUT) 신규. `app/api/jobs/route.js` POST 핸들러와 로컬/원격 MCP 둘 다 이 fallback 로직을 씀(`getOwnerDefaults()` 헬퍼).
- **템플릿 목업(갤러리) 페이지 신규**: `app/(app)/templates/gallery/page.js` — 레이아웃 5종/자막프리셋 8종/인트로 10종을 실제 프리셋 데이터 파일 값 그대로 시각적으로 미리보기. 가짜 값 없음.
- **네이버 뉴스 검색 MCP 도구 추가**: `search_naver_news` — `lib/naverNews.js`(신규, 프레시시즌의 실제 구현을 그대로 참고해 작성), 로컬/원격 MCP 둘 다 등록 완료. 자격증명(`NAVER_CLIENT_ID`/`SECRET`, developers.naver.com 검색 API)은 다른 AI/TTS 키와 동일하게 Supabase `app_config` 테이블에 저장해서 `loadRemoteConfig()`가 자동으로 불러옴 — 로컬/Vercel 둘 다 재배포 없이 씀. curl로 실제 API 응답 확인 완료(정상 작동).

## 음성 페르소나 23종 추가 (2026-08-20 추가)

- `lib/voicePresets.js`(신규): 실사이트 API 문서의 음성 alias 23종(seoa/하준/... 등, 한국어12·일본어3·영어6·기타2)을 그대로 가져오되, 우리 TTS 백엔드(fal.ai가 감싼 ElevenLabs eleven-v3)는 다른 보이스 라이브러리를 쓰기 때문에 fal.ai 공식 모델 페이지(fal.ai/models/fal-ai/elevenlabs/tts/eleven-v3)에서 실제로 문서화된 21개 보이스 이름(Aria/Roger/Sarah/...)으로 성별·톤이 비슷한 것을 하나씩 매핑했다. 21개 < 23개라 chloe/jay 2개는 다른 페르소나와 fal 보이스를 공유(주석에 명시).
  - `lib/generateVoice.js`의 `synthesizeWithFal`이 `resolveFalVoice()`로 별칭(예: `seoa`)을 실제 fal 보이스 이름으로 변환. 실제 FAL_KEY로 `voice: 'seoa'` 합성 호출까지 실제 검증함(정상적으로 오디오 55KB 생성 확인).
  - `/new`, `/settings`(자동화 기본값) 양쪽에 "음성 페르소나" Pill 선택 UI 추가(voiceProvider가 fal일 때만 노출). `automation_defaults` 테이블에 `voice_id` 컬럼 추가(스키마 파일 갱신 + 기존 DB용 ALTER 마이그레이션 SQL 전달함).
  - 로컬/원격 MCP(`create_shorts`)에도 `voice` enum 파라미터 추가, `list_options`에 `voicePresets` 포함.
  - **ElevenLabs(무료 티어) provider는 이번에 포함 안 함**: fal은 이름 기반이라 매핑 가능했지만 ElevenLabs 자체 API는 계정별 voiceId 해시를 쓰기 때문에 실제 계정 키로 `GET /v1/voices` 조회부터 필요함. 지금 `ELEVENLABS_API_KEY`가 app_config에 아예 없는 것도 확인함(코드 주석에도 "실제 키로 검증 못함"이라 적혀있었음). 사용자가 elevenlabs.io 무료 계정 만들어서 키를 주면 이어서 매핑 예정 — **다음 세션 이어갈 것**.

## 다음에 할 일 (우선순위 순, 사용자가 "어차피 다 해야 하는거야, 순차적으로" 라고 확인함)

1. **ElevenLabs 무료 티어 음성 매핑**: 사용자가 elevenlabs.io 키 발급하면 실제 voice_id 조회해서 페르소나 매핑 이어가기
2. **유튜브 지원**: 자막 PO 토큰 문제 재확인됨(여전히 막힘). 3가지 선택지(제목+설명만/`youtubei.js`/Puppeteer) 중 아직 미결정.
3. ~~`npm run worker`를 이 PC에서 상시 실행 상태로 유지~~ → **완료**: 바탕화면 "UShort 워커 시작" 바로가기(`워커_시작.bat`) 생성함. 완전 자동 시작(로그온 시 백그라운드)은 보류하고, 사용자가 원할 때 더블클릭으로 켜는 방식 선택함(사용자 확인).

## 하지 않기로 한 것 (스코프 아웃, 이유 있음)

- 회원가입/로그인/결제 UI, 스톡영상 자동 매칭, QR 폰사진 전송 — 전부 조사는 했으나 이번 개인용 MVP 범위 밖 (단, 로그인/약관/관리자는 2026-08-20에 결국 구현함 — 위 섹션 참고. 이 줄은 과거 기록이라 남겨두되 최신 상태는 아님)
- 39개 "reference-*" 예시 템플릿 전부 재현 — 위에서 확인했듯 이건 별도 디자인이 아니라 5개 레이아웃의 예시 주제 갤러리라서 재현할 실익이 없음. 레이아웃 자체(5종)는 위에서 다 만듦.
- 로컬 Postgres/Docker로 DB 왕복 실제 검증 — 이 환경에 Docker가 없어서 불가능했음. UI/코드 레벨 검증으로 대체함
