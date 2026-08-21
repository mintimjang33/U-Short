#!/usr/bin/env node
/**
 * 렌더링 워커. 이 PC에서 계속 켜둬야 하는 프로세스다.
 * Vercel(app/api/jobs)은 job을 queued 상태로 만들기만 하고, 실제 대본/음성/자막/렌더링은
 * 전부 여기서(이 컴퓨터의 자원으로) 처리한다 — Vercel 서버리스 함수의 실행시간 제한 때문에
 * 렌더링 자체를 Vercel에서 돌릴 수 없어서 이렇게 분리했다.
 *
 * 실행: node scripts/worker.js (또는 npm run worker)
 * 이 프로세스가 꺼져있으면 Vercel에서 새 프로젝트를 만들어도 영원히 "대기중" 상태로 남는다.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const { getSupabaseServerClient } = await import('../lib/supabase.js');
const { runPipeline, runSceneUpdateRender } = await import('../lib/pipeline.js');

const POLL_INTERVAL_MS = 5000;
let running = true;

process.on('SIGINT', () => {
  console.log('\n[worker] 종료 신호 받음, 현재 처리 중인 job 끝나면 종료합니다...');
  running = false;
});

async function pickNextQueuedJob(supabase) {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, project_id, kind')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[worker] job 조회 실패:', error.message);
    return null;
  }
  return data;
}

async function main() {
  const supabase = getSupabaseServerClient();
  console.log('[worker] 시작됨. 5초마다 queued job을 확인합니다. (Ctrl+C로 종료)');

  while (running) {
    const job = await pickNextQueuedJob(supabase);
    if (job) {
      console.log(`[worker] job 처리 시작: ${job.id} (project ${job.project_id}, kind=${job.kind || 'full'})`);
      try {
        if (job.kind === 'scene_update') {
          await runSceneUpdateRender({ projectId: job.project_id, jobId: job.id });
        } else {
          await runPipeline({ projectId: job.project_id, jobId: job.id });
        }
        console.log(`[worker] job 완료: ${job.id}`);
      } catch (err) {
        console.error(`[worker] job 처리 중 예외: ${job.id}`, err);
      }
    } else {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
  console.log('[worker] 종료됨.');
}

main();
