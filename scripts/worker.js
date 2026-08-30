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
const { runPipeline, runSceneUpdateRender, runVoiceUpdateRender, runVideoEditPipeline, runAiInfluencerVideo } = await import('../lib/pipeline.js');
// U-OneShot 컷대리(별도 Next.js 앱, 같은 Supabase 프로젝트 공유)용 — uos_cutdaeri_projects는
// 이 워커의 jobs/projects 테이블과 무관한 독립 테이블이라 큐잉 방식만 폴링에 추가하고,
// 기존 jobs 처리 로직(pickNextQueuedJob 등)은 전혀 건드리지 않는다.
const { runCutDaeriRender } = await import('../lib/cutDaeriPipeline.js');
const { runInstatoonPipeline } = await import('../lib/instatoonPipeline.js');
const { runCardnewsPipeline } = await import('../lib/cardnewsPipeline.js');
const { processNextPendingFlowTask } = await import('../lib/generateImageViaFlow.js');

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

async function pickNextCutDaeriProject(supabase) {
  const { data, error } = await supabase
    .from('uos_cutdaeri_projects')
    .select('id, topic')
    .eq('status', 'rendering')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[worker] 컷대리 프로젝트 조회 실패:', error.message);
    return null;
  }
  return data;
}

async function pickNextAiInfluencerVideo(supabase) {
  const { data, error } = await supabase
    .from('ai_influencer_videos')
    .select('id, topic')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[worker] AI 인플루언서 영상 조회 실패:', error.message);
    return null;
  }
  return data;
}

async function pickNextInstatoonProject(supabase) {
  const { data, error } = await supabase
    .from('instatoon_projects')
    .select('id, topic')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[worker] 인스타툰 프로젝트 조회 실패:', error.message);
    return null;
  }
  return data;
}

async function pickNextCardnewsProject(supabase) {
  const { data, error } = await supabase
    .from('cardnews_projects')
    .select('id, topic')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[worker] 카드뉴스 프로젝트 조회 실패:', error.message);
    return null;
  }
  return data;
}

async function main() {
  const supabase = getSupabaseServerClient();
  console.log('[worker] 시작됨. 5초마다 queued job / 컷대리 렌더링 / 인스타툰·카드뉴스 대기열을 확인합니다. (Ctrl+C로 종료)');

  while (running) {
    const job = await pickNextQueuedJob(supabase);
    if (job) {
      console.log(`[worker] job 처리 시작: ${job.id} (project ${job.project_id}, kind=${job.kind || 'full'})`);
      try {
        if (job.kind === 'scene_update') {
          await runSceneUpdateRender({ projectId: job.project_id, jobId: job.id });
        } else if (job.kind === 'voice_update') {
          await runVoiceUpdateRender({ projectId: job.project_id, jobId: job.id });
        } else if (job.kind === 'video_edit') {
          await runVideoEditPipeline({ projectId: job.project_id, jobId: job.id });
        } else {
          await runPipeline({ projectId: job.project_id, jobId: job.id });
        }
        console.log(`[worker] job 완료: ${job.id}`);
      } catch (err) {
        console.error(`[worker] job 처리 중 예외: ${job.id}`, err);
      }
      continue;
    }

    const cutDaeriProject = await pickNextCutDaeriProject(supabase);
    if (cutDaeriProject) {
      console.log(`[worker] 컷대리 렌더링 시작: ${cutDaeriProject.topic} (${cutDaeriProject.id})`);
      try {
        const { videoUrl } = await runCutDaeriRender({ projectId: cutDaeriProject.id });
        console.log(`[worker] 컷대리 렌더링 완료: ${videoUrl}`);
      } catch (err) {
        console.error(`[worker] 컷대리 렌더링 중 예외: ${cutDaeriProject.id}`, err);
      }
      continue;
    }

    const influencerVideo = await pickNextAiInfluencerVideo(supabase);
    if (influencerVideo) {
      console.log(`[worker] AI 인플루언서 영상 생성 시작: ${influencerVideo.topic} (${influencerVideo.id})`);
      try {
        await runAiInfluencerVideo({ videoRowId: influencerVideo.id });
        console.log(`[worker] AI 인플루언서 영상 생성 완료: ${influencerVideo.id}`);
      } catch (err) {
        console.error(`[worker] AI 인플루언서 영상 생성 중 예외: ${influencerVideo.id}`, err);
      }
      continue;
    }

    const instatoonProject = await pickNextInstatoonProject(supabase);
    if (instatoonProject) {
      console.log(`[worker] 인스타툰 생성 시작: ${instatoonProject.topic} (${instatoonProject.id})`);
      try {
        await runInstatoonPipeline({ projectId: instatoonProject.id });
        console.log(`[worker] 인스타툰 생성 완료: ${instatoonProject.id}`);
      } catch (err) {
        console.error(`[worker] 인스타툰 생성 중 예외: ${instatoonProject.id}`, err);
      }
      continue;
    }

    const cardnewsProject = await pickNextCardnewsProject(supabase);
    if (cardnewsProject) {
      console.log(`[worker] 카드뉴스 생성 시작: ${cardnewsProject.topic} (${cardnewsProject.id})`);
      try {
        await runCardnewsPipeline({ projectId: cardnewsProject.id });
        console.log(`[worker] 카드뉴스 생성 완료: ${cardnewsProject.id}`);
      } catch (err) {
        console.error(`[worker] 카드뉴스 생성 중 예외: ${cardnewsProject.id}`, err);
      }
      continue;
    }

    // Google Flow 이미지 생성(puppeteer-core로 실제 크롬 조작, 완전자동). 크롬 창이 뜨는
    // 작업이라 다른 job들과 마찬가지로 한 번에 하나씩만 순차 처리한다.
    try {
      const flowResult = await processNextPendingFlowTask(supabase);
      if (flowResult) {
        console.log(`[worker] Flow 이미지 생성 ${flowResult.status}: ${flowResult.id}${flowResult.error ? ' - ' + flowResult.error : ''}`);
        continue;
      }
    } catch (err) {
      console.error('[worker] Flow 작업 처리 중 예외:', err);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  console.log('[worker] 종료됨.');
}

main();
