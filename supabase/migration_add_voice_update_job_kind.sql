-- ⑩ 파이프라인 단계별 분리 실행: jobs.kind 체크 제약에 'voice_update' 추가. Supabase SQL Editor에서 실행하세요.
alter table jobs drop constraint jobs_kind_check;
alter table jobs add constraint jobs_kind_check check (kind = any (array['full'::text, 'scene_update'::text, 'voice_update'::text]));
