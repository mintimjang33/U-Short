/**
 * Google Flow(labs.google/fx/tools/flow)로 이미지를 생성한다 — 단, 공식 API가 없어서
 * fal.ai처럼 직접 호출할 수 없다. 대신 사용자 PC에서 puppeteer-core가 실제 설치된 크롬을
 * 별도 프로필로 직접 띄워서 Flow 화면을 조작한다(lib/flowBrowserAutomation.js) — 완전자동.
 *
 * 최초 버전(chrome-extension-flow/, content script)은 isTrusted 검사 때문에 "생성" 버튼을
 * 스크립트로 못 눌러서 사용자가 매번 직접 클릭해야 하는 반자동이었다. puppeteer-core는
 * CDP로 진짜 입력을 보내기 때문에(유쓰레드 워커가 이미 실전 검증한 것과 같은 원리) 이 제약이
 * 없다 — 2026-08-30 라이브 테스트로 확인(Claude in Chrome의 computer 툴로 같은 걸 먼저
 * 검증한 뒤, 유쓰레드 worker/collectBenchmark.js 패턴 그대로 puppeteer-core로 이식함).
 *
 * 이 방식은 Google Flow의 자체 구독 크레딧을 그대로 쓰기 때문에(fal Nano Banana처럼 건당
 * API 과금이 없음) 비용은 절감되지만, (1) 이 PC에서 워커가 켜져 있어야 하고, (2) Google이
 * Flow UI를 바꾸면 깨질 수 있고, (3) reCAPTCHA Enterprise로 자동화를 탐지하려는 정황이 있어
 * 계정 리스크가 있다 — 화질/비용 절감이 꼭 필요할 때만 쓸 것.
 *
 * 2026-08-31 추가 — HongHub 공학 파이프라인 6번 단계(이미지 2장 → 영상 클립) 지원:
 * task.reference_image_urls가 채워져 있으면 generateVideoWithFlowBrowser로 분기한다.
 * 이 부분은 실제 Flow 프로젝트 화면의 DOM 구조(업로드 input, 썸네일 선택, "Add to Prompt")를
 * 라이브로 조사해서 짰지만, 실제 크레딧을 써서 생성까지 끝까지 돌려본 적은 아직 없다 —
 * flowBrowserAutomation.js의 selectUploadedThumbnails 주석 참고, 처음 실행할 때 헤드풀
 * 크롬 창을 눈으로 보면서 확인할 것.
 */
import crypto from 'node:crypto';
import { generateImageWithFlowBrowser, generateVideoWithFlowBrowser } from './flowBrowserAutomation.js';
import { loadRemoteConfig } from './remoteConfig.js';

const BUCKET = 'shorts';
const DEFAULT_FLOW_PROJECT_URL = 'https://labs.google/fx/tools/flow/project/5f89573f-5534-4e7b-ba3a-70ef8ce3300d';

// 워커가 flow_generation_tasks의 pending 항목 하나를 집어서 puppeteer-core로 실제 처리한다
// (cardnewsPipeline/instatoonPipeline과 같은 "워커가 직접 처리" 패턴 — scripts/worker.js에서 호출).
export async function processNextPendingFlowTask(supabase) {
  const { data: task, error } = await supabase
    .from('flow_generation_tasks')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`flow_generation_tasks 조회 실패: ${error.message}`);
  if (!task) return null;

  const { data: claimed, error: claimError } = await supabase
    .from('flow_generation_tasks')
    .update({ status: 'claimed', claimed_at: new Date().toISOString() })
    .eq('id', task.id)
    .eq('status', 'pending')
    .select()
    .maybeSingle();
  if (claimError) throw new Error(`flow_generation_tasks claim 실패: ${claimError.message}`);
  if (!claimed) return null; // 다른 폴링 사이클이 먼저 채감.

  try {
    await loadRemoteConfig();
    const projectUrl = process.env.FLOW_PROJECT_URL || DEFAULT_FLOW_PROJECT_URL;

    // reference_image_urls가 있으면 "이미지 2장(클린+인포그래픽) → 영상 클립" 경로
    // (HongHub 공학 파이프라인 6번 단계용, 2026-08-31 추가). 없으면 기존 텍스트→이미지 경로.
    const isImageToVideo = Array.isArray(claimed.reference_image_urls) && claimed.reference_image_urls.length > 0;
    const buffer = isImageToVideo
      ? await generateVideoWithFlowBrowser({ prompt: claimed.prompt, projectUrl, imageUrls: claimed.reference_image_urls })
      : await generateImageWithFlowBrowser({ prompt: claimed.prompt, projectUrl });

    const ext = isImageToVideo ? 'mp4' : 'png';
    const contentType = isImageToVideo ? 'video/mp4' : 'image/png';
    const storagePath = `flow-generated/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType });
    if (uploadError) throw new Error(`Storage 업로드 실패: ${uploadError.message}`);
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    await supabase
      .from('flow_generation_tasks')
      .update({ status: 'completed', result_url: pub.publicUrl, completed_at: new Date().toISOString() })
      .eq('id', claimed.id);
    return { id: claimed.id, status: 'completed', resultUrl: pub.publicUrl };
  } catch (err) {
    await supabase
      .from('flow_generation_tasks')
      .update({ status: 'failed', error_message: String(err?.message || err), completed_at: new Date().toISOString() })
      .eq('id', claimed.id);
    return { id: claimed.id, status: 'failed', error: String(err?.message || err) };
  }
}
/**
 * 큐에 넣기만 하고 바로 반환한다(폴링 안 함) — 반자동이라 사용자가 실제로 생성 버튼을 누를
 * 때까지 몇 분씩 걸릴 수 있어서, MCP 도구 호출처럼 응답 시간 제한이 있는 곳에서는 이걸 쓰고
 * getFlowGenerationStatus로 따로 상태를 확인해야 한다(create_shorts+get_job_status와 같은 패턴).
 * lib/pipeline.js처럼 애초에 오래 걸려도 되는 로컬 워커 안에서만 아래 generateImageViaFlow
 * (블로킹 폴링 버전)를 직접 써도 된다.
 */
export async function queueFlowImageGeneration({ prompt, aspectRatio = '1:1', referenceImageUrls = [] }, { supabase }) {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('queueFlowImageGeneration: prompt가 비어있습니다.');
  }
  const { data: task, error } = await supabase
    .from('flow_generation_tasks')
    .insert({ prompt, aspect_ratio: aspectRatio, reference_image_urls: referenceImageUrls })
    .select()
    .single();
  if (error) throw new Error(`flow_generation_tasks insert 실패: ${error.message}`);
  return task;
}

export async function getFlowGenerationStatus(taskId, { supabase }) {
  const { data, error } = await supabase
    .from('flow_generation_tasks')
    .select('id, status, result_url, error_message, created_at, claimed_at, completed_at')
    .eq('id', taskId)
    .single();
  if (error) throw new Error(`flow_generation_tasks 조회 실패: ${error.message}`);
  return data;
}

export async function generateImageViaFlow(
  { prompt, aspectRatio = '1:1', referenceImageUrls = [] },
  { supabase, pollIntervalMs = 4000, maxAttempts = 90 }
) {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('generateImageViaFlow: prompt가 비어있습니다.');
  }

  const { data: task, error: insertError } = await supabase
    .from('flow_generation_tasks')
    .insert({ prompt, aspect_ratio: aspectRatio, reference_image_urls: referenceImageUrls })
    .select()
    .single();
  if (insertError) throw new Error(`flow_generation_tasks insert 실패: ${insertError.message}`);

  for (let i = 0; i < maxAttempts; i++) {
    const { data: row, error } = await supabase
      .from('flow_generation_tasks')
      .select('status, result_url, error_message')
      .eq('id', task.id)
      .single();
    if (error) throw new Error(`flow_generation_tasks 조회 실패: ${error.message}`);

    if (row.status === 'completed') {
      if (!row.result_url) throw new Error('Google Flow 작업이 completed인데 result_url이 없습니다.');
      return { imageUrl: row.result_url };
    }
    if (row.status === 'failed') {
      throw new Error(`Google Flow 생성 실패: ${row.error_message || '알 수 없는 오류'}`);
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(
    `Google Flow 생성 타임아웃(${(maxAttempts * pollIntervalMs) / 1000}초) — 크롬 확장 프로그램이 켜져 있고 Flow 탭이 열려있는지 확인하세요. (task id: ${task.id})`
  );
}
