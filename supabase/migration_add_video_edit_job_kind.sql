-- 숏폼/롱폼 편집(내 영상 업로드): jobs.kind 체크 제약에 'video_edit' 추가. Supabase SQL Editor에서 실행하세요.
alter table jobs drop constraint jobs_kind_check;
alter table jobs add constraint jobs_kind_check check (kind = any (array['full'::text, 'scene_update'::text, 'voice_update'::text, 'video_edit'::text]));
