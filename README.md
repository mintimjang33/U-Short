# 슈퍼쇼츠 클론 (개인용 로컬 버전)

블로그 URL 하나로 9:16 세로 쇼츠 영상을 자동 제작합니다. supershorts.co.kr을 실제 로그인해서 뜯어본 뒤,
핵심 파이프라인(URL → 대본 → 음성 → 자막 → 렌더링)과 대시보드/템플릿 에디터까지 개인 로컬 도구로 구현했습니다.

- 자세한 설계 배경/의사결정/현재 진행 상황은 [PLAN.md](./PLAN.md) 참고 (메모리 없는 세션이 이어받아도 되도록 최신 상태 유지 중)
- **서버를 따로 운영할 필요 없습니다.** 내 PC에서 `npm run dev`로 띄우고, DB/파일 저장만 Supabase(관리형)를 씁니다.
- **DB 조회/관리용 MCP 서버도 딸려 있습니다** ([`mcp-server/`](./mcp-server), 아래 6번 참고).

## 1. 필요한 것

| 항목 | 용도 | 어디서 |
|---|---|---|
| Node.js | 이미 설치되어 있음 (v24 확인됨) | - |
| Supabase 프로젝트 | DB + 영상 저장소 | 기존 Supabase 계정에서 **New Project** |
| 대본 생성 AI 키 1개 | Claude / Gemini / GPT 중 택1 | 아래 참고 |
| 음성(TTS) 키 1개 | fal.ai(추천) / ElevenLabs / CLOVA 중 택1 | 아래 참고 |

### 대본 생성 AI (`SCRIPT_PROVIDER`, 화면에서도 매번 바꿀 수 있음)
- `claude` (기본): [console.anthropic.com](https://console.anthropic.com) → API Keys
- `gemini`: [Google AI Studio](https://aistudio.google.com/apikey) — Flash 모델 무료 티어 있음, 연습용으로 좋음
- `gpt`: [platform.openai.com](https://platform.openai.com/api-keys)

### 음성 (`TTS_PROVIDER`, 화면에서도 매번 바꿀 수 있음)
- `fal` (기본): 이미 FAL_KEY가 있으면 바로 사용 가능. 고정 월정액 없음.
- `elevenlabs`: 월 10,000자까지 무료 — 연습/테스트용으로 추천. [elevenlabs.io](https://elevenlabs.io)
- `clova`: Naver CLOVA Voice Premium. **월 기본료 90,000원(사용량 0이어도 고정) + 100만자 초과분 1,000자당 100원**(ncloud.com 공식 요금 확인). 대량 운영 아니면 비추천.

### Supabase
1. 기존 Supabase 계정에서 **New Project** (계정을 새로 만들 필요 없음 — 프로젝트별로 DB/과금이 독립적)
2. Project Settings → API에서 URL, service role key 확인
3. SQL Editor에 [`supabase/schema.sql`](./supabase/schema.sql) 전체 실행 (테이블 3개 + Storage 버킷 + MCP용 읽기전용 SQL 함수까지 한 번에 생성됨)

## 2. 설치 & 실행

```bash
cp .env.local.example .env.local
# .env.local 열어서 위 키들 채워넣기

npm install
npm run dev
# http://localhost:3000 (또는 --port로 지정한 포트)
```

## 3. 무엇을 실제로 검증했는지 (정직하게 표로 정리)

대충 만들지 않기로 약속드려서, 실제로 설치·실행해서 확인한 것과 못 한 것을 명확히 구분합니다.
(자세한 버그 히스토리는 [PLAN.md](./PLAN.md)의 "발견해서 고친 실제 버그" 참고)

| 구성 요소 | 상태 | 검증 방법 |
|---|---|---|
| 블로그 본문 추출 (`lib/extract.js`) | ✅ 실제 검증 | 실제 네이버 블로그 글 URL로 직접 실행, 본문/이미지 정상 추출 확인 |
| 자막 타이밍 로직 (`lib/buildCaptions.js`) | ✅ 실제 검증 | 유닛 테스트로 alignment/Whisper words/균등분배 3경로 모두 통과 |
| 영상 렌더링 (`lib/render.js`, Remotion 레이아웃 2종) | ✅ 실제 검증 | 더미 대본+무음 오디오로 실제 mp4 렌더링 성공 (파일 전달함) |
| Next.js 빌드 전체 | ✅ 실제 검증 | `npm run build` 통과 |
| 화면 UI (`/new`, `/templates`) | ✅ 실제 검증 | `npm run dev`로 띄워서 브라우저로 직접 클릭 테스트 — Remotion Player 실시간 프리뷰, 소스 탭 전환 등 동작 확인 |
| API 라우트 에러 처리 | ✅ 실제 검증 (+버그 수정) | 브라우저 테스트 중 Supabase 미연결 시 API가 깨진 응답을 주던 실제 버그 발견해서 고침 |
| MCP 서버 (`mcp-server/`) | ✅ 프로토콜 레벨 검증 | 실제 JSON-RPC로 initialize/tools-list/tools-call 확인 (더미 DB로) |
| 대본 생성 (`lib/generateScript.js`, Claude/Gemini/GPT) | ⚠️ 코드만 작성 | API 키가 없어 실행 검증 못 함 — 처음 실행 시 응답 형식 다시 확인 필요 |
| 음성 합성 (`lib/generateVoice.js`, fal/ElevenLabs/CLOVA) | ⚠️ 코드만 작성 | 마찬가지로 키가 없어 실행 검증 못 함 |
| 자막 정밀 타이밍 (`lib/transcribeTimestamps.js`, fal Whisper) | ⚠️ 코드만 작성 | 무음 테스트 오디오로는 검증 불가, 실제 음성 필요 |
| Supabase 연동 전체 (DB 왕복) | ⚠️ 스키마만 작성 | 실제 프로젝트가 없고 Docker도 없어 로컬 Postgres도 못 띄움 — 완전 미검증 |

**정리하면 "URL 추출 → 영상 렌더링" 핵심 엔진과 화면 UI는 실제로 동작하는 걸 확인했고,
AI 대본/AI 음성/Whisper/Supabase DB 왕복은 실제 키와 프로젝트를 넣고 처음 실행하실 때 같이 확인이 필요합니다.**
에러가 나면 그대로 알려주세요 — API 응답 형식이 문서와 다르면 바로 고쳐드릴게요.

## 4. 화면 구성

- `/` 대시보드 — 내 프로젝트 목록 + 완료 영상 수/누적 크레딧 통계
- `/new` 새 프로젝트 — 소스(블로그 링크 / 직접 대본 작성) + 옵션(스타일/언어/길이/레이아웃/자막/AI provider) + 저장된 템플릿 불러오기 + 배경 이미지 업로드
- `/templates` 템플릿 에디터 — 레이아웃 선택 + 제목/부가정보/배경/자막 커스터마이징 + 실시간 프리뷰(Remotion Player) + 저장/불러오기/업데이트/삭제
- `/projects/[id]` 결과 화면 — 진행 단계 실시간 표시(2초 폴링) → 완료 시 영상 미리보기+다운로드, 실패 시 재시도 버튼, 삭제 버튼

## 5. 지금은 없는 것 (스코프 아웃, 이유 있음)

- 회원가입/로그인/결제 — 지금은 나 혼자 쓰는 로컬 도구라 없음. DB에 `user_id` 컬럼은 이미 있어서
  나중에 Supabase Auth를 붙이면 `supabase/schema.sql` 맨 아래 주석 처리된 RLS 정책만 켜면 됨.
- 바이럴민트(인물 프리젠터) 레이아웃, 스톡영상 자동 매칭, QR 폰사진 전송 — 조사는 했지만 이번 범위 밖
- 44개 템플릿 전부 재현 — 레이아웃 2종 × 자막 프리셋 6종 + 커스텀 패널로 대체

## 6. MCP 서버 — Claude가 직접 쇼츠를 만들어줄 수 있음

`mcp-server/`는 `Downloads/.mcp.json`에 `supershorts-clone`이라는 이름으로 등록된 로컬 MCP 서버입니다.
Claude Code가 이 폴더에서 켜져 있으면 자동으로 도구가 잡히고, **Next.js 개발 서버(`npm run dev`)를 안 켜놔도**
Claude에게 "이 블로그 글로 쇼츠 만들어줘"라고 하면 `create_shorts` 도구로 직접 파이프라인을 돌려서 완성된 영상 URL까지 받을 수 있습니다.

```bash
cd mcp-server
npm install   # 이미 되어 있음
```

`.env.local`(프로젝트 루트)에 키를 채워두면 별도 설정 없이 바로 씁니다. 제공 도구:
- **작업 수행**: `create_shorts`(쇼츠 처음부터 끝까지 제작), `retry_job`, `get_job_status`, `upload_asset`(이미지 업로드), `list_options`(유효한 옵션값 조회)
- **DB 직접 관리**: `list_tables`, `get_rows`, `upsert_row`, `delete_row`, `run_sql`(읽기전용), `list_projects_summary`
