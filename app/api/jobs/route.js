import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { runPipeline } from '../../../lib/pipeline.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';

export const POST = withApiErrorHandling(async (request) => {
  const body = await request.json().catch(() => null);
  if (!body || (!body.sourceUrl && !body.sourceText)) {
    return NextResponse.json(
      { error: 'sourceUrl 또는 sourceText 중 하나는 필요합니다.' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();

  const options = {
    planningMode: body.planningMode || 'auto',
    style: body.style || 'summary',
    outputLanguage: body.outputLanguage || 'original',
    lengthMode: body.lengthMode || 'shortform',
    scriptProvider: body.scriptProvider || 'claude',
    voiceProvider: body.voiceProvider || 'fal',
    voice: body.voice || null,
    introEnabled: !!body.introEnabled,
  };

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      source_url: body.sourceUrl || null,
      source_text: body.sourceText || null,
      layout_id: body.layoutId || 'info',
      content_template_id: body.captionPresetId || 'existing-preset-bold-white-outline',
      background: body.background || {},
      extra_info: body.extraInfo || [],
      options,
    })
    .select()
    .single();

  if (projectError) {
    return NextResponse.json({ error: `프로젝트 생성 실패: ${projectError.message}` }, { status: 500 });
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({ project_id: project.id, status: 'queued' })
    .select()
    .single();

  if (jobError) {
    return NextResponse.json({ error: `job 생성 실패: ${jobError.message}` }, { status: 500 });
  }

  // fire-and-forget: 응답은 바로 주고 파이프라인은 백그라운드에서 진행 (실사이트의 202+job_id 패턴과 동일)
  runPipeline({ projectId: project.id, jobId: job.id }).catch((err) => {
    console.error('[api/jobs] runPipeline 처리 중 예외', err);
  });

  return NextResponse.json({ projectId: project.id, jobId: job.id }, { status: 202 });
});

export const GET = withApiErrorHandling(async (request) => {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const projectId = searchParams.get('projectId');

  if (!jobId && !projectId) {
    return NextResponse.json({ error: 'jobId 또는 projectId가 필요합니다.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  let query = supabase.from('jobs').select('*, projects(*)').order('created_at', { ascending: false });
  query = jobId ? query.eq('id', jobId) : query.eq('project_id', projectId);

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'job을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json(data);
});
