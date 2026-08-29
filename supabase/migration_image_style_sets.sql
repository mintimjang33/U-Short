-- ⑤⑥ 그림체 스타일 + 캐릭터 일관성 레퍼런스 이미지 세트용 테이블. Supabase SQL Editor에서 실행하세요.
create table if not exists image_style_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  art_style_id text,                      -- lib/options.js의 ART_STYLE_PRESETS id (선택)
  reference_image_urls text[] not null default '{}',  -- 최대 2장, Supabase Storage 공개 URL
  created_at timestamptz not null default now()
);

alter table image_style_sets enable row level security;

create policy "image_style_sets_select_own" on image_style_sets
  for select using (auth.uid() = user_id or user_id is null);
create policy "image_style_sets_insert_own" on image_style_sets
  for insert with check (auth.uid() = user_id or user_id is null);
create policy "image_style_sets_delete_own" on image_style_sets
  for delete using (auth.uid() = user_id or user_id is null);
