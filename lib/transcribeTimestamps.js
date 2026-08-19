/**
 * fal.ai의 Whisper 엔드포인트로 이미 생성된 음성 파일의 단어별 타임스탬프를 얻는다.
 * TTS provider(fal-eleven-v3, Clova)가 자체 alignment를 안 줄 때, "균등분배 근사"보다
 * 정확한 자막 싱크를 얻기 위한 보조 단계. FAL_KEY가 없거나 요청이 실패하면 조용히 null을
 * 반환한다 — 이 단계는 있으면 좋은 개선이지 파이프라인이 반드시 필요로 하는 필수 단계가
 * 아니므로, 실패해도 lib/pipeline.js가 durationMs 균등분배로 폴백해서 계속 진행한다.
 *
 * 주의: FAL_KEY가 있어서 실제로 호출은 가능하지만, 이 파일 작성 시점엔 실제 오디오로
 * 실행 검증은 못 했다 (테스트용 오디오가 무음이라 Whisper가 단어를 인식 못 함).
 *
 * @param {string} audioUrl - 공개 http(s) 오디오 URL (Supabase Storage 업로드 후 URL)
 * @param {string} [language] - 'ko' 등 ISO 639-1, 생략하면 자동 감지
 * @returns {Promise<Array<{text:string,startMs:number,endMs:number}>|null>}
 */
export async function transcribeWordTimestamps(audioUrl, language) {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://fal.run/fal-ai/whisper', {
      method: 'POST',
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        task: 'transcribe',
        chunk_level: 'word',
        ...(language ? { language } : {}),
      }),
    });

    if (!res.ok) {
      console.warn(`[transcribeWordTimestamps] fal Whisper 실패 (${res.status}), 근사치로 폴백`);
      return null;
    }

    const json = await res.json();
    const chunks = json.chunks || [];

    const words = chunks
      .filter(
        (c) =>
          Array.isArray(c.timestamp) &&
          c.timestamp.length === 2 &&
          c.timestamp[0] != null &&
          c.timestamp[1] != null &&
          c.text?.trim()
      )
      .map((c) => ({
        text: c.text.trim(),
        startMs: Math.round(c.timestamp[0] * 1000),
        endMs: Math.round(c.timestamp[1] * 1000),
      }));

    return words.length > 0 ? words : null;
  } catch (err) {
    console.warn('[transcribeWordTimestamps] 예외 발생, 근사치로 폴백:', err.message);
    return null;
  }
}
