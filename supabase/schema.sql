-- 슈퍼쇼츠 클론 — Supabase 스키마
-- Supabase 프로젝트 생성 후 SQL Editor에 이 파일 전체를 붙여넣고 실행하세요.
-- 지금은 로그인 기능이 없어 user_id는 전부 nullable입니다.
-- 나중에 Supabase Auth를 붙일 때: user_id를 NOT NULL로 바꾸고,
-- 파일 맨 아래 주석 처리된 RLS 정책들의 주석만 해제하면 됩니다(테이블 구조 변경 불필요).

create extension if not exists "pgcrypto";

-- 프로젝트: "새로 제작" 화면에서 만든 쇼츠 1건의 설정값 전체
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null, -- 나중에 auth.users(id) 참조로 전환

  source_url text,
  source_text text,

  title_line1 text,
  title_line2 text,

  layout_id text not null default 'info',              -- 'info' | 'card'
  content_template_id text not null default 'existing-preset-bold-white-outline',

  title_style jsonb not null default '{}'::jsonb,
  caption_style jsonb not null default '{}'::jsonb,
  background jsonb not null default '{}'::jsonb,
  extra_info jsonb not null default '[]'::jsonb,

  options jsonb not null default '{}'::jsonb,
  -- options 예시: { "planningMode": "auto", "variantCount": 1, "lengthMode": "shortform",
  --                 "introEnabled": false, "introTemplateId": null, "introDisplayOnly": true,
  --                 "voice": "seoa", "outputLanguage": "ko" }

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Job: 프로젝트 1건을 실제로 생성 파이프라인에 태운 실행 기록 (슈퍼쇼츠 실제 API의 job과 동일 개념)
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,

  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  stage text
    check (stage in ('extract', 'script', 'voice', 'captions', 'render', 'done')),
  error_message text,

  credits_used int not null default 0,
  video_url text, -- 완료 시 Supabase Storage 공개 URL

  idempotency_key text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_project_id_idx on jobs(project_id);
create unique index if not exists jobs_idempotency_key_idx on jobs(idempotency_key) where idempotency_key is not null;

-- 내 템플릿: 템플릿 에디터에서 "저장하기" 누른 커스텀 설정
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  name text not null,
  layout_id text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- updated_at 자동 갱신
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at
  before update on projects
  for each row execute function set_updated_at();

drop trigger if exists jobs_set_updated_at on jobs;
create trigger jobs_set_updated_at
  before update on jobs
  for each row execute function set_updated_at();

-- Storage: 배경/로고 업로드, 렌더링된 mp4를 담을 버킷 (공개 읽기)
insert into storage.buckets (id, name, public)
values ('shorts', 'shorts', true)
on conflict (id) do nothing;

-- MCP 서버(mcp-server/)의 run_sql 도구가 쓰는 읽기전용 SQL 실행 함수.
-- SELECT로 시작하는 쿼리만 허용해서, AI 에이전트가 실수로 DROP/DELETE 등을 실행하지 못하게 막는다.
create or replace function exec_readonly_sql(query text)
returns setof json
language plpgsql
security definer
as $$
begin
  if query !~* '^\s*select\b' then
    raise exception 'exec_readonly_sql: SELECT 문만 허용됩니다.';
  end if;
  if query ~* ';\s*\S' then
    raise exception 'exec_readonly_sql: 세미콜론으로 문장을 여러 개 이어붙일 수 없습니다.';
  end if;
  return query execute format('select row_to_json(t) from (%s) t', query);
end;
$$;

-- ── SaaS 전환 시 여기 주석 해제 ──────────────────────────────
-- alter table projects enable row level security;
-- alter table jobs enable row level security;
-- alter table templates enable row level security;
--
-- create policy "본인 프로젝트만 조회" on projects
--   for select using (auth.uid() = user_id);
-- create policy "본인 프로젝트만 생성" on projects
--   for insert with check (auth.uid() = user_id);
-- create policy "본인 프로젝트만 수정" on projects
--   for update using (auth.uid() = user_id);
--
-- create policy "본인 job만 조회" on jobs
--   for select using (
--     exists (select 1 from projects p where p.id = jobs.project_id and p.user_id = auth.uid())
--   );
--
-- create policy "본인 템플릿만 조회" on templates
--   for select using (auth.uid() = user_id);
-- create policy "본인 템플릿만 생성" on templates
--   for insert with check (auth.uid() = user_id);
