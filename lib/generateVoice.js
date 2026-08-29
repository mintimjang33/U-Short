/**
 * TTS(음성 합성) provider 추상화. 기본은 fal.ai(사용자가 이미 FAL_KEY를 갖고 있어 추가
 * 가입 없이 바로 쓸 수 있고, 고정 월 기본료 없이 쓴 만큼만 과금됨).
 * fal은 fal-ai/elevenlabs/tts/eleven-v3 엔드포인트로 ElevenLabs 보이스를 그대로 호출한다.
 *
 * Naver CLOVA Voice Premium은 실제 요금(ncloud.com 공식 페이지 확인)이 월 기본료
 * 90,000원(사용량 0이어도 고정) + 100만자까지 포함 + 초과분 1,000자당 100원이라
 * 개인이 가끔 영상 몇 개 만드는 용도로는 비효율적이라 기본값에서 제외했다.
 * TTS_PROVIDER=clova / elevenlabs(자체 계정) 로 바꿔서 그대로 쓸 수도 있다.
 *
 * 주의: 셋 다 이 파일 작성 시점엔 실제 키로 실행 검증을 못 했다(fal은 사용자 키가 있으니
 * 가장 먼저 실제 실행해서 응답 형태를 재확인해볼 것).
 */
import { resolveFalVoice } from './voicePresets.js';

// 공통 speed(0.7~1.2, 1.0=기본)를 CLOVA 네이티브 speed(-5~5, 0=기본, 값이 클수록 느려짐 — CLOVA
// 스펙상 양수가 "느림"이라 부호를 뒤집어 변환한다)로 매핑.
function normalizedSpeedToClova(speed) {
  const clamped = Math.max(0.7, Math.min(1.2, speed ?? 1.0));
  return String(Math.round((1 - clamped) * 25)); // 1.2 -> -5(빠름), 1.0 -> 0, 0.7 -> +5(느림)
}

async function synthesizeWithClova({ text, voice, credentials, speed }) {
  const clientId = credentials?.clientId || process.env.NAVER_CLOVA_CLIENT_ID;
  const clientSecret = credentials?.clientSecret || process.env.NAVER_CLOVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('NAVER_CLOVA_CLIENT_ID / NAVER_CLOVA_CLIENT_SECRET 환경변수가 필요합니다.');
  }

  const body = new URLSearchParams({
    speaker: voice || 'nara',
    volume: '0',
    speed: normalizedSpeedToClova(speed),
    pitch: '0',
    format: 'mp3',
    text,
  });

  const res = await fetch('https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts', {
    method: 'POST',
    headers: {
      'X-NCP-APIGW-API-KEY-ID': clientId,
      'X-NCP-APIGW-API-KEY': clientSecret,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Clova Voice 요청 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  // Clova는 문자 단위 타임스탬프를 제공하지 않는다 → buildCaptions.js가 균등분배로 근사한다.
  return { audioBuffer, alignment: null };
}

async function synthesizeWithElevenLabs({ text, voice, credentials, speed }) {
  const apiKey = credentials?.apiKey || process.env.ELEVENLABS_API_KEY;
  const voiceId = voice || process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    throw new Error('ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID 환경변수가 필요합니다.');
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { speed: Math.max(0.7, Math.min(1.2, speed ?? 1.0)) },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ElevenLabs 요청 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const audioBuffer = Buffer.from(json.audio_base64, 'base64');
  // alignment: { characters: string[], character_start_times_seconds: number[], character_end_times_seconds: number[] }
  return { audioBuffer, alignment: json.alignment || null };
}

async function synthesizeWithFal({ text, voice, speed }) {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    throw new Error('FAL_KEY 환경변수가 필요합니다.');
  }

  const res = await fetch('https://fal.run/fal-ai/elevenlabs/tts/eleven-v3', {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice: resolveFalVoice(voice),
      // fal.ai 모델 API 문서(2026-08 확인)에 따르면 speed는 0.7~1.2 범위, 기본 1 — 실제 지원 확인됨.
      speed: Math.max(0.7, Math.min(1.2, speed ?? 1.0)),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`fal TTS 요청 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const audioUrl = json.audio?.url;
  if (!audioUrl) {
    throw new Error(`fal 응답에 audio.url이 없습니다: ${JSON.stringify(json).slice(0, 300)}`);
  }

  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) {
    throw new Error(`fal이 돌려준 오디오 URL 다운로드 실패 (${audioRes.status}): ${audioUrl}`);
  }
  const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

  // fal의 eleven-v3 응답은 문자 단위 타임스탬프를 기본으로 안 준다 → 균등분배로 근사한다.
  // (timestamps 옵션이 있어 보이나 응답 형태를 확인 못 해 여기선 요청하지 않음 — 다음 단계 후보)
  return { audioBuffer, alignment: null };
}

/**
 * 텍스트를 음성으로 변환한다.
 * @param {object} params
 * @param {string} params.text - 읽을 내레이션 텍스트
 * @param {string} [params.voice] - provider별 voice id/alias
 * @param {'fal'|'elevenlabs'|'clova'} [params.provider] - 지정 안 하면 TTS_PROVIDER 환경변수(기본 fal) 사용
 * @param {object} [params.credentials] - /account에 등록한 사용자 개인 키. 있으면 전역 환경변수보다 우선한다.
 * @param {number} [params.speed] - 재생 속도, 0.7(느림)~1.2(빠름), 기본 1.0. 세 provider 전부 지원 확인됨
 *   (fal/ElevenLabs는 API가 그대로 받는 0.7~1.2 범위, CLOVA는 다른 네이티브 범위라 내부에서 변환함).
 * @returns {Promise<{audioBuffer: Buffer, alignment: object|null}>}
 */
export async function synthesizeVoice({ text, voice, provider, credentials, speed }) {
  if (!text || text.trim().length === 0) {
    throw new Error('synthesizeVoice: text가 비어있습니다.');
  }

  const resolvedProvider = (provider || process.env.TTS_PROVIDER || 'fal').toLowerCase();
  if (resolvedProvider === 'clova') {
    return synthesizeWithClova({ text, voice, credentials, speed });
  }
  if (resolvedProvider === 'elevenlabs') {
    return synthesizeWithElevenLabs({ text, voice, credentials, speed });
  }
  return synthesizeWithFal({ text, voice, speed });
}
