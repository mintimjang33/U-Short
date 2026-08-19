import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../../lib/apiHandler.js';

const BUCKET = 'shorts';

export const GET = withApiErrorHandling(async (_request, { params }) => {
  const { id } = params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*, jobs(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(data);
});

export const DELETE = withApiErrorHandling(async (_request, { params }) => {
  const { id } = params;
  const supabase = getSupabaseServerClient();

  const { data: jobs } = await supabase.from('jobs').select('id').eq('project_id', id);

  // jobs 테이블은 projects FK에 on delete cascade가 걸려있지만,
  // Storage에 올려둔 음성/영상 파일은 자동으로 안 지워지므로 먼저 정리한다.
  if (jobs?.length) {
    const paths = jobs.flatMap((j) => [`jobs/${j.id}/voice.mp3`, `jobs/${j.id}/final.mp4`]);
    await supabase.storage.from(BUCKET).remove(paths);
  }

  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
});
