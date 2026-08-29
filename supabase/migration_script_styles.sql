-- ④ 레퍼런스 대본 학습→저장 기능용 테이블. Supabase SQL Editor에서 실행하세요.
create table if not exists script_styles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  reference_text text not null,
  style_description text not null,
  created_at timestamptz not null default now()
);

alter table script_styles enable row level security;

-- API 라우트/MCP는 service_role 키로 접속해 RLS를 우회하므로 지금 당장 필수는 아니지만,
-- 다른 테이블(projects/templates)과 동일하게 나중에 브라우저 직접조회 대비용으로 켜둔다.
create policy "script_styles_select_own" on script_styles
  for select using (auth.uid() = user_id or user_id is null);
create policy "script_styles_insert_own" on script_styles
  for insert with check (auth.uid() = user_id or user_id is null);
create policy "script_styles_delete_own" on script_styles
  for delete using (auth.uid() = user_id or user_id is null);
