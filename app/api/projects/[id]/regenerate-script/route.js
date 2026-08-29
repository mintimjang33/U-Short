import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../../../lib/apiHandler.js';
import { extractBlogContent } from '../../../../../lib/extract.js';
import { generateScript } from '../../../../../lib/generateScript.js';
import { loadRemoteConfig } from '../../../../../lib/remoteConfig.js';

// ⑩ 파이프라인 단계별 분리 실행: 이 프로젝트의 원본 소스로 대본만 다시 만들어서 "미리보기"로
// 돌려준다 — DB를 건드리지 않고, 렌더링도 하지 않는다. 마음에 들면 /api/jobs에
// preGeneratedScript로 그대로 넘겨서 새 job을 만들면 된다(기존 프로젝트를 덮어쓰지 않고
// 새 프로젝트로 제작 — 원본이 남아있어야 비교/롤백이 되므로 의도적으로 이렇게 설계함).
export const POST = withApiErrorHandling(async (request, { params }) => {
  await loadRemoteConfig();
  const { id } = params;
  const body = await request.json().catch(() => ({})) || {};

  const supabase = getSupabaseServerClient();
  const { data: project, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  let sourceText = project.source_text || null;
  let images = [];
  if (project.source_url) {
    const extracted = await extractBlogContent(project.source_url);
    sourceText = sourceText || extracted.text;
    images = extracted.images;
  }
  if (!sourceText) {
    return NextResponse.json({ error: '이 프로젝트는 원본 텍스트(source_url/source_text)가 없어서 대본을 다시 만들 수 없습니다.' }, { status: 400 });
  }

  const options = project.options || {};
  const script = await generateScript({
    sourceText,
    planningMode: body.planningMode || options.planningMode || 'auto',
    style: body.style || options.style || 'summary',
    outputLanguage: body.outputLanguage || options.outputLanguage || 'original',
    lengthMode: body.lengthMode || options.lengthMode || 'shortform',
    targetChars: body.targetChars || options.targetChars || undefined,
    customStyleDescription: body.customStyleDescription || undefined,
    provider: body.scriptProvider || options.scriptProvider,
  });

  return NextResponse.json({ ...script, images, sourceText });
});
