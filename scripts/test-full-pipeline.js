import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const { getSupabaseServerClient } = await import('../lib/supabase.js');
const { runPipeline } = await import('../lib/pipeline.js');

const supabase = getSupabaseServerClient();

const sourceText =
  '요즘 밤에 잠이 잘 안 온다면 자기 전 스마트폰부터 내려놓으세요. ' +
  '화면에서 나오는 블루라이트가 수면 호르몬인 멜라토닌 분비를 늦춰서 잠들기 더 어렵게 만듭니다. ' +
  '자기 30분 전에는 조명을 어둡게 하고, 미지근한 물로 샤워하면 체온이 자연스럽게 내려가면서 졸음이 옵니다.';

const { data: project, error: projectError } = await supabase
  .from('projects')
  .insert({
    source_text: sourceText,
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
console.log('파이프라인 실행 시작...');

await runPipeline({ projectId: project.id, jobId: job.id });

const { data: finalJob } = await supabase.from('jobs').select('*').eq('id', job.id).single();
console.log('=== 최종 결과 ===');
console.log(JSON.stringify(finalJob, null, 2));
