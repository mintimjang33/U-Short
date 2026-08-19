import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase.js';
import { runPipeline } from '../../../../../lib/pipeline.js';
import { withApiErrorHandling } from '../../../../../lib/apiHandler.js';

// 실패(또는 완료)한 job을 같은 프로젝트 설정 그대로 다시 실행한다.
// 기존 job은 이력으로 남기고 새 job row를 만든다 (실사이트의 재시도와 동일하게 새 실행 취급).
export const POST = withApiErrorHandling(async (_request, { params }) => {
  const { id: jobId } = params;
  const supabase = getSupabaseServerClient();

  const { data: existingJob, error: fetchError } = await supabase
    .from('jobs')
    .select('project_id')
    .eq('id', jobId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existingJob) {
    return NextResponse.json({ error: '해당 job을 찾을 수 없습니다.' }, { status: 404 });
  }

  const { data: newJob, error: insertError } = await supabase
    .from('jobs')
    .insert({ project_id: existingJob.project_id, status: 'queued' })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  runPipeline({ projectId: existingJob.project_id, jobId: newJob.id }).catch((err) => {
    console.error('[api/jobs/retry] runPipeline 처리 중 예외', err);
  });

  return NextResponse.json({ jobId: newJob.id }, { status: 202 });
});
