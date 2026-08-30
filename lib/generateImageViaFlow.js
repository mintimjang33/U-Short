/**
 * Google Flow(labs.google/fx/tools/flow)로 이미지를 생성한다 — 단, 공식 API가 없어서
 * fal.ai처럼 직접 호출할 수 없다. 대신 사용자 PC의 크롬 확장 프로그램(chrome-extension-flow/)이
 * 사용자가 이미 로그인해둔 Flow 세션의 화면을 대신 조작해서 생성하고, 그 결과를 여기로 채워넣는
 * "로컬 대행" 구조다(유쓰레드 워커의 draft-queue와 같은 패턴).
 *
 * 이 방식은 Google Flow의 자체 구독 크레딧을 그대로 쓰기 때문에(fal Nano Banana처럼 건당
 * API 과금이 없음) 비용은 절감되지만, (1) 확장 프로그램이 켜져 있고 Flow 탭이 열려 있어야
 * 하고, (2) Google이 Flow UI를 바꾸면 깨질 수 있고, (3) reCAPTCHA Enterprise로 자동화를
 * 탐지하려는 정황이 있어 계정 리스크가 있다 — 화질/비용 절감이 꼭 필요할 때만 쓸 것.
 *
 * 실제 동작 확인(2026-08-30): labs.google/fx/tools/flow에 실제 로그인해서 프롬프트 입력→생성→
 * 이미지 4장 완성까지 라이브로 검증함. 단, 이 파일이 의존하는 크롬 확장 프로그램
 * (chrome-extension-flow/)의 텍스트 입력 로직은 별도로 라이브 테스트하지 못했다 — 처음
 * 설치 후 실제로 한 번 돌려보고 안 되면 content.js의 insertTextIntoSlate()부터 점검할 것.
 */
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
