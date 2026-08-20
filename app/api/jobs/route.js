import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';
import { getCurrentUser } from '../../../lib/supabaseServerAuth.js';

export const POST = withApiErrorHandling(async (request) => {
  const body = await request.json().catch(() => null);
  if (!body || (!body.sourceUrl && !body.sourceText)) {
    return NextResponse.json(
      { error: 'sourceUrl 또는 sourceText 중 하나는 필요합니다.' },
      { status: 400 }
    );
  }

  const user = await getCurrentUser();
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
      user_id: user?.id || null,
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

  // 여기서는 job을 queued로 만들기만 하고 끝낸다 — 실제 렌더링은 이 서버(Vercel일 수 있음)가 아니라
  // scripts/worker.js를 돌리고 있는 PC가 Supabase를 폴링해서 가져가 처리한다.
  // (렌더링은 무겁고 오래 걸려서 Vercel 서버리스 함수 안에서 직접 돌리면 시간제한에 걸림)
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
