/**
 * AI 영상 클립 생성 provider 추상화. TTS(lib/generateVoice.js)와 같은 FAL_KEY를 재사용한다 —
 * fal.ai가 아래 4개 모델을 전부 호스팅하므로 새 계정/키가 필요 없다.
 *
 * 2026-08 시세 기준 4개 모델을 실제로 비교해서 고른 기본값(초당 단가 낮은 순):
 *   - wan(기본)  wan/v2.6/text-to-video            초당 $0.05  (8초 약 $0.4) — 멀티샷 스토리텔링 지원, 가성비 1순위
 *   - kling      fal-ai/kling-video/v3/standard/text-to-video   8초 약 $0.6~0.7 — 화질/모션 안정적, 균형점
 *   - seedance   bytedance/seedance-2.0/fast/text-to-video      8초 약 $0.6~1.3(해상도별) — 바이트댄스, 역동적인 카메라워크
 *   - veo        fal-ai/veo3.1/lite                              초당 $0.05~0.4대, 화질 최상위지만 제일 비쌈
 * kie.ai 같은 서드파티 재판매(Veo3를 $0.4~까지 낮춤)는 Trustpilot 2.5점·크레딧 소실 불만이 있어 제외했고,
 * 구글 플로우(Veo Omni, labs.google/flow) 구독제는 더 싸지만(40초 영상당 750~1800원) 공식 API가 없어
 * 이 자동화 파이프라인엔 못 붙인다(.env.local.example 참고).
 *
 * TTS(synthesizeWithFal)는 동기 fal.run 엔드포인트지만, 영상 생성은 30초~수분 걸려서
 * fal의 큐 API(submit → status 폴링 → result)를 써야 한다 — 호출 패턴이 다르니 주의.
 *
 * ⚠️ 실제 FAL_KEY로 아직 실행 검증 못함. lib/generateVoice.js 등 이 프로젝트의 다른 provider
 * 파일들과 동일하게 문서 기준으로만 작성 — 처음 실제로 쓸 때 응답 필드명(특히 video.url 경로)을
 * 재확인할 것. fal 모델 페이지가 바뀌면 MODEL_IDS만 갱신하면 된다.
 */

const MODEL_IDS = {
  wan: 'wan/v2.6/text-to-video',
  kling: 'fal-ai/kling-video/v3/standard/text-to-video',
  seedance: 'bytedance/seedance-2.0/fast/text-to-video',
  veo: 'fal-ai/veo3.1/lite',
};

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 90; // 최대 6분

async function submitJob(modelId, input, apiKey) {
  const res = await fetch(`https://queue.fal.run/${modelId}`, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`fal 영상 생성 요청 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }
  const json = await res.json();
  if (!json.request_id) {
    throw new Error(`fal 응답에 request_id가 없습니다: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json.request_id;
}

async function pollUntilDone(modelId, requestId, apiKey) {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const res = await fetch(`https://queue.fal.run/${modelId}/requests/${requestId}/status`, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`fal 상태 조회 실패 (${res.status}): ${errText.slice(0, 300)}`);
    }
    const json = await res.json();
    if (json.status === 'COMPLETED') return;
    if (json.status === 'FAILED' || json.status === 'ERROR') {
      throw new Error(`fal 영상 생성 실패: ${JSON.stringify(json).slice(0, 300)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`fal 영상 생성 타임아웃 (${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}초 초과)`);
}

async function fetchResult(modelId, requestId, apiKey) {
  const res = await fetch(`https://queue.fal.run/${modelId}/requests/${requestId}`, {
    headers: { Authorization: `Key ${apiKey}` },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`fal 결과 조회 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }
  return res.json();
}

// provider별 요청 body 형태. 문서상으로만 확인했고(⚠️ 위 파일 헤더 참고) 실제 키로 첫 호출 시
// 파라미터명이 다르면(특히 duration 타입: 문자열 vs 숫자) 여기만 고치면 된다.
function buildInput(provider, prompt, durationSec) {
  if (provider === 'veo') {
    // veo3.1 lite: 초 단위 문자열, 4~8초 범위만 지원.
    return { prompt, aspect_ratio: '9:16', duration: `${Math.min(Math.max(durationSec, 4), 8)}s` };
  }
  if (provider === 'kling') {
    // kling v3 standard: 5초/10초 단위만 받는다 — 근접한 쪽으로 반올림.
    return { prompt, aspect_ratio: '9:16', duration: durationSec <= 7 ? '5' : '10' };
  }
  if (provider === 'seedance') {
    // seedance 2.0 fast: 숫자(초) 그대로 받되 5~10초 범위로 클램프.
    return { prompt, aspect_ratio: '9:16', duration: Math.min(Math.max(durationSec, 5), 10) };
  }
  // wan v2.6: 숫자(초) 그대로 받되 5~15초 범위로 클램프. 멀티샷 스토리텔링을 지원하므로
  // 프롬프트에 여러 비트가 있어도 한 번에 자연스럽게 이어붙여준다.
  return { prompt, aspect_ratio: '9:16', duration: Math.min(Math.max(durationSec, 5), 15) };
}

/**
 * 장면 프롬프트 하나로 짧은 세로(9:16) 영상 클립을 생성해서 버퍼로 돌려준다.
 * @param {object} params
 * @param {string} params.prompt - 영어 영상 생성 프롬프트 (장면 묘사)
 * @param {'wan'|'kling'|'seedance'|'veo'} [params.provider] - 기본 wan(가성비 1순위, 2026-08 시세 비교 기준)
 * @param {number} [params.durationSec] - 목표 길이(초). provider별로 허용 범위에 맞게 반올림/클램프된다.
 * @returns {Promise<{videoBuffer: Buffer, contentType: string}>}
 */
export async function generateVideoClip({ prompt, provider = 'wan', durationSec = 8 }) {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    throw new Error('FAL_KEY 환경변수가 필요합니다 (TTS와 동일한 키를 재사용합니다).');
  }
  if (!prompt || !prompt.trim()) {
    throw new Error('generateVideoClip: prompt가 비어있습니다.');
  }

  const resolvedProvider = MODEL_IDS[provider] ? provider : 'wan';
  const modelId = MODEL_IDS[resolvedProvider];
  const input = buildInput(resolvedProvider, prompt, durationSec);

  const requestId = await submitJob(modelId, input, apiKey);
  await pollUntilDone(modelId, requestId, apiKey);
  const result = await fetchResult(modelId, requestId, apiKey);

  const videoUrl = result.video?.url || result.data?.video?.url;
  if (!videoUrl) {
    throw new Error(`fal 응답에서 영상 URL을 찾지 못했습니다: ${JSON.stringify(result).slice(0, 300)}`);
  }

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) {
    throw new Error(`fal이 돌려준 영상 URL 다운로드 실패 (${videoRes.status}): ${videoUrl}`);
  }
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

  return { videoBuffer, contentType: 'video/mp4' };
}
