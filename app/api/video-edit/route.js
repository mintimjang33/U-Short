import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';
import { getCurrentUser } from '../../../lib/supabaseServerAuth.js';

// 숏폼/롱폼 편집: 사용자가 /api/upload로 이미 올려둔 본인 영상 URL을 받아 프로젝트를 만들고
// video_edit job을 큐에 넣는다. AI 대본/TTS를 전혀 안 쓰므로 sourceUrl/sourceText가 필요 없다.
export const POST = withApiErrorHandling(async (request) => {
  const body = await request.json().catch(() => null);
  if (!body || !body.videoUrl) {
    return NextResponse.json({ error: 'videoUrl은 필수입니다(먼저 /api/upload로 영상을 올려주세요).' }, { status: 400 });
  }

  const user = await getCurrentUser();
  const supabase = getSupabaseServerClient();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      user_id: user?.id || null,
      layout_id: 'video-edit',
      content_template_id: body.captionPresetId || 'existing-preset-bold-white-outline',
      background: { color: body.backgroundColor || '#0a0a0a', videoUrl: body.videoUrl, imageUrl: null },
      extra_info: body.extraInfo || [],
      options: {
        outputLanguage: body.outputLanguage || 'original',
        titlePresetId: body.titlePresetId || 'title-white-basic',
        introEnabled: body.introEnabled ?? false,
        introTemplateId: body.introTemplateId || null,
        introDisplayOnly: true,
      },
    })
    .select()
    .single();

  if (projectError) return NextResponse.json({ error: `프로젝트 생성 실패: ${projectError.message}` }, { status: 500 });

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({ project_id: project.id, status: 'queued', kind: 'video_edit' })
    .select()
    .single();
  if (jobError) return NextResponse.json({ error: `job 생성 실패: ${jobError.message}` }, { status: 500 });

  return NextResponse.json({ projectId: project.id, jobId: job.id }, { status: 202 });
});
