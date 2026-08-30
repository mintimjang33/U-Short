/**
 * fal.ai AI Avatar(single-text)로 "가상 인플루언서"가 대본을 말하는 영상을 생성한다.
 * 얼굴 사진 1장 + 텍스트만 주면 TTS 음성 합성과 립싱크를 fal이 전부 자동으로 처리한다
 * (별도로 generateVoice.js/generateScript.js의 TTS를 쓰지 않음 — 이 모델 자체가 텍스트→음성→
 * 립싱크 영상까지 한 번에 함). TTS/영상클립 생성과 같은 FAL_KEY를 재사용한다.
 *
 * 영상 생성이라 fal의 큐 API(submit → request_id → status 폴링 → result)를 쓴다 —
 * lib/generateVideoClips.js와 동일한, 실제 검증된 패턴을 그대로 재사용.
 */
const MODEL_ID = 'fal-ai/ai-avatar/single-text';
const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 90; // 최대 6분

/**
 * @param {object} params
 * @param {string} params.imageUrl - 인플루언서 얼굴이 나온 정면 사진 URL
 * @param {string} params.text - 말할 대본(내레이션)
 * @param {string} [params.voice] - fal TTS 보이스 이름(Aria/Roger/Sarah 등). 기본 Aria
 * @param {string} [params.prompt] - 영상 스타일 지시(기본: 자연스러운 정면 인물 영상)
 * @param {'480p'|'720p'} [params.resolution] - 기본 480p
 * @returns {Promise<{videoUrl: string}>}
 */
export async function generateTalkingAvatar({ imageUrl, text, voice = 'Aria', prompt, resolution = '480p' }) {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) throw new Error('FAL_KEY 환경변수가 필요합니다.');
  if (!imageUrl) throw new Error('generateTalkingAvatar: imageUrl이 필요합니다.');
  if (!text || text.trim().length === 0) throw new Error('generateTalkingAvatar: text가 비어있습니다.');

  const submitRes = await fetch(`https://queue.fal.run/${MODEL_ID}`, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      text_input: text,
      voice,
      prompt: prompt || 'natural talking head video, subtle head movement, looking at camera, professional lighting',
      resolution,
    }),
  });
  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => '');
    throw new Error(`fal AI Avatar 요청 실패 (${submitRes.status}): ${errText.slice(0, 300)}`);
  }
  const submitJson = await submitRes.json();
  const requestId = submitJson.request_id;
  if (!requestId) throw new Error(`fal 응답에 request_id가 없습니다: ${JSON.stringify(submitJson).slice(0, 300)}`);
  // fal의 큐 라우팅은 모델별로 상태/결과 URL이 MODEL_ID와 다를 수 있다
  // (예: fal-ai/ai-avatar/single-text 제출 시 실제 큐는 fal-ai/ai-avatar 아래에 생김).
  // 직접 조합하지 말고 제출 응답이 준 status_url/response_url을 그대로 써야 한다.
  const statusUrl = submitJson.status_url || `https://queue.fal.run/${MODEL_ID}/requests/${requestId}/status`;
  const resultUrl = submitJson.response_url || `https://queue.fal.run/${MODEL_ID}/requests/${requestId}`;

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    if (!statusRes.ok) throw new Error(`fal 상태 조회 실패 (${statusRes.status})`);
    const statusJson = await statusRes.json();
    if (statusJson.status === 'COMPLETED') break;
    if (statusJson.status === 'FAILED' || statusJson.status === 'ERROR') {
      throw new Error(`fal AI Avatar 생성 실패: ${JSON.stringify(statusJson).slice(0, 300)}`);
    }
    if (i === MAX_POLL_ATTEMPTS - 1) {
      throw new Error(`fal AI Avatar 생성 타임아웃 (${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}초 초과)`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  const resultRes = await fetch(resultUrl, {
    headers: { Authorization: `Key ${apiKey}` },
  });
  if (!resultRes.ok) throw new Error(`fal 결과 조회 실패 (${resultRes.status})`);
  const result = await resultRes.json();
  const videoUrl = result.video?.url;
  if (!videoUrl) throw new Error(`fal 응답에 video.url이 없습니다: ${JSON.stringify(result).slice(0, 300)}`);

  return { videoUrl };
}
