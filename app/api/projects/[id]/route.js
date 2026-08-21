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

// 폴더 이동처럼 재렌더가 필요 없는 단순 메타데이터 수정과, 상세편집(scenes 저장 + 재렌더 job)을 둘 다 처리한다.
export const PATCH = withApiErrorHandling(async (request, { params }) => {
  const { id } = params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: '요청 본문이 필요합니다.' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  if (body.folderId !== undefined && !Array.isArray(body.scenes)) {
    const { error } = await supabase.from('projects').update({ folder_id: body.folderId }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!Array.isArray(body.scenes)) {
    return NextResponse.json({ error: 'scenes 배열이 필요합니다.' }, { status: 400 });
  }

  const { error: updateError } = await supabase.from('projects').update({ scenes: body.scenes }).eq('id', id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({ project_id: id, status: 'queued', kind: 'scene_update' })
    .select()
    .single();
  if (jobError) return NextResponse.json({ error: `재렌더 job 생성 실패: ${jobError.message}` }, { status: 500 });

  return NextResponse.json({ jobId: job.id }, { status: 202 });
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
