-- AI 인플루언서(가상 페르소나가 말하는 영상 자동생성) 테이블. Supabase SQL Editor에서 실행하세요.
create table if not exists ai_influencers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  reference_image_url text not null,   -- 얼굴이 나온 정면 사진 1장(fal ai-avatar 입력용)
  voice text not null default 'Aria',  -- fal TTS 보이스 이름(Aria/Roger/Sarah 등, generateVoice.js와 동일 목록)
  personality text,                    -- 말투/성격 지침(대본 생성 시 참고, 선택)
  created_at timestamptz not null default now()
);

alter table ai_influencers enable row level security;

create policy "ai_influencers_select_own" on ai_influencers
  for select using (auth.uid() = user_id or user_id is null);
create policy "ai_influencers_insert_own" on ai_influencers
  for insert with check (auth.uid() = user_id or user_id is null);
create policy "ai_influencers_delete_own" on ai_influencers
  for delete using (auth.uid() = user_id or user_id is null);

-- 생성된 영상 이력(선택적 - 실제로는 없어도 되지만 목록 조회용으로 남겨둠)
create table if not exists ai_influencer_videos (
  id uuid primary key default gen_random_uuid(),
  influencer_id uuid references ai_influencers(id) on delete cascade,
  topic text not null,
  narration text,
  video_url text,
  status text not null default 'processing',
  error_message text,
  created_at timestamptz not null default now()
);

alter table ai_influencer_videos enable row level security;
create policy "ai_influencer_videos_select_all" on ai_influencer_videos for select using (true);
create policy "ai_influencer_videos_insert_all" on ai_influencer_videos for insert with check (true);
create policy "ai_influencer_videos_delete_all" on ai_influencer_videos for delete using (true);
