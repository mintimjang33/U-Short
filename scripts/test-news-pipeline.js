import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const { getSupabaseServerClient } = await import('../lib/supabase.js');
const { runPipeline } = await import('../lib/pipeline.js');

const sourceUrl = 'https://n.news.naver.com/article/031/0001051225';

const supabase = getSupabaseServerClient();

const { data: project, error: projectError } = await supabase
  .from('projects')
  .insert({
    source_url: sourceUrl,
    layout_id: 'info',
    options: { planningMode: 'auto', style: 'summary', outputLanguage: 'original', lengthMode: 'shortform' },
  })
  .select()
  .single();

if (projectError) {
  console.error('프로젝트 생성 실패:', projectError.message);
  process.exit(1);
}
console.log('project 생성됨:', project.id);

const { data: job, error: jobError } = await supabase
  .from('jobs')
  .insert({ project_id: project.id, status: 'queued' })
  .select()
  .single();

if (jobError) {
  console.error('job 생성 실패:', jobError.message);
  process.exit(1);
}
console.log('job 생성됨:', job.id);
console.log('뉴스 URL로 파이프라인 실행 시작...', sourceUrl);

await runPipeline({ projectId: project.id, jobId: job.id });

const { data: finalJob } = await supabase.from('jobs').select('*, projects(*)').eq('id', job.id).single();
console.log('=== 최종 결과 ===');
console.log(JSON.stringify(finalJob, null, 2));
