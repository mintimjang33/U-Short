-- 카드뉴스(정보성 카드 N장) 프로젝트 테이블. Supabase SQL Editor에서 실행하세요.
-- 구조는 instatoon_projects와 거의 동일하되, 컷이 스토리 진행이 아니라
-- 표지(훅) → 정보 카드(1~2줄) → 요약/마무리 형식이라는 점이 다르다(HongHub의
-- 카드뉴스 포맷 규칙과 동일한 컨벤션: 카드1=표지, 마지막 카드=요약/참여유도).
create table if not exists cardnews_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  topic text not null,
  style_set_id uuid references image_style_sets(id) on delete set null,
  card_count int not null default 6,
  status text not null default 'queued',   -- queued | processing | completed | failed
  stage text,                              -- planning | generating
  cards jsonb not null default '[]',       -- [{type, title, text, imageUrl}]
  error_message text,
  created_at timestamptz not null default now()
);

alter table cardnews_projects enable row level security;

create policy "cardnews_projects_select_own" on cardnews_projects
  for select using (auth.uid() = user_id or user_id is null);
create policy "cardnews_projects_insert_own" on cardnews_projects
  for insert with check (auth.uid() = user_id or user_id is null);
create policy "cardnews_projects_delete_own" on cardnews_projects
  for delete using (auth.uid() = user_id or user_id is null);
