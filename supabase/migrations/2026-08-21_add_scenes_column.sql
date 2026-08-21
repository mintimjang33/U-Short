-- 상세편집(장면별 미디어/자막 프리셋) 기능을 위한 컬럼 추가.
-- Supabase 대시보드 → SQL Editor에서 실행하세요.
alter table projects
  add column if not exists scenes jsonb not null default '[]'::jsonb;

alter table projects
  add column if not exists captions jsonb not null default '[]'::jsonb;

alter table projects
  add column if not exists audio_url text;

alter table projects
  add column if not exists duration_ms integer;

alter table jobs
  add column if not exists kind text not null default 'full';

alter table jobs drop constraint if exists jobs_kind_check;
alter table jobs add constraint jobs_kind_check check (kind in ('full', 'scene_update'));
