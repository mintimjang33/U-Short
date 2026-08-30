-- Google Flow 연동(크롬 확장 프로그램) 큐용 테이블. Supabase SQL Editor에서 실행하세요.
-- 서버는 여기 row를 insert만 하고, 사용자 PC의 크롬 확장 프로그램이 폴링해서
-- 실제 생성을 대신 수행한 뒤 결과를 채워넣는다(유쓰레드 워커의 draft-queue와 비슷한 로컬-대행 패턴).
create table if not exists flow_generation_tasks (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  aspect_ratio text not null default '1:1',
  reference_image_urls text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'claimed', 'completed', 'failed')),
  result_url text,
  error_message text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz
);

alter table flow_generation_tasks enable row level security;

create policy "flow_generation_tasks_all" on flow_generation_tasks
  for all using (true) with check (true);

-- 확장 프로그램 인증용 토큰. 원하는 임의의 문자열로 바꿔서 실행하세요(예: 32자 랜덤 문자열).
-- 이 값을 크롬 확장 프로그램 팝업에도 똑같이 붙여넣어야 페어링됩니다.
insert into app_config (key, value)
values ('FLOW_EXTENSION_TOKEN', 'flow-ext-CHANGE-ME-1234567890')
on conflict (key) do nothing;
