-- 인스타툰(캐릭터 고정 반복생성 카드형 콘텐츠) 프로젝트 테이블. Supabase SQL Editor에서 실행하세요.
create table if not exists instatoon_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  topic text not null,
  character_style_set_id uuid references image_style_sets(id) on delete set null,
  panel_count int not null default 6,
  status text not null default 'queued',   -- queued | processing | completed | failed
  stage text,                              -- planning | generating
  panels jsonb not null default '[]',      -- [{text, imagePrompt, imageUrl}]
  error_message text,
  created_at timestamptz not null default now()
);

alter table instatoon_projects enable row level security;

create policy "instatoon_projects_select_own" on instatoon_projects
  for select using (auth.uid() = user_id or user_id is null);
create policy "instatoon_projects_insert_own" on instatoon_projects
  for insert with check (auth.uid() = user_id or user_id is null);
create policy "instatoon_projects_delete_own" on instatoon_projects
  for delete using (auth.uid() = user_id or user_id is null);
