function splitIntoWords(text) {
  return text.split(/\s+/).filter(Boolean);
}

function chunkWords(words, wordsPerChunk) {
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk));
  }
  return chunks;
}

function buildFromAlignment(alignment, wordsPerChunk) {
  const {
    characters,
    character_start_times_seconds: starts,
    character_end_times_seconds: ends,
  } = alignment;

  if (!characters || !starts || !ends || characters.length !== starts.length) {
    throw new Error('buildCaptions: alignment 형식이 올바르지 않습니다.');
  }

  const words = [];
  let currentWord = '';
  let wordStart = null;
  let lastEnd = 0;

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    if (/\s/.test(ch)) {
      if (currentWord) {
        words.push({ text: currentWord, startMs: wordStart * 1000, endMs: lastEnd * 1000 });
        currentWord = '';
        wordStart = null;
      }
      continue;
    }
    if (wordStart === null) wordStart = starts[i];
    currentWord += ch;
    lastEnd = ends[i];
  }
  if (currentWord) {
    words.push({ text: currentWord, startMs: wordStart * 1000, endMs: lastEnd * 1000 });
  }

  const chunks = chunkWords(words, wordsPerChunk);
  return chunks.map((chunk) => ({
    text: chunk.map((w) => w.text).join(' '),
    startMs: Math.round(chunk[0].startMs),
    endMs: Math.round(chunk[chunk.length - 1].endMs),
  }));
}

function buildFromWords(words, wordsPerChunk) {
  const chunks = chunkWords(words, wordsPerChunk);
  return chunks.map((chunk) => ({
    text: chunk.map((w) => w.text).join(' '),
    startMs: Math.round(chunk[0].startMs),
    endMs: Math.round(chunk[chunk.length - 1].endMs),
  }));
}

function buildFromEvenSplit(narration, durationMs, wordsPerChunk) {
  const words = splitIntoWords(narration);
  const chunks = chunkWords(words, wordsPerChunk);
  const totalChars = narration.replace(/\s+/g, '').length;

  let cursorMs = 0;
  const result = [];
  for (const chunk of chunks) {
    const chunkText = chunk.join(' ');
    const chunkChars = chunkText.replace(/\s+/g, '').length;
    const chunkDurationMs =
      totalChars > 0 ? (chunkChars / totalChars) * durationMs : durationMs / chunks.length;

    result.push({
      text: chunkText,
      startMs: Math.round(cursorMs),
      endMs: Math.round(cursorMs + chunkDurationMs),
    });
    cursorMs += chunkDurationMs;
  }
  return result;
}

/**
 * 내레이션 텍스트 + (있으면) TTS/STT 타임스탬프를 자막 큐 배열로 변환한다.
 * 정확도 우선순위: alignment(ElevenLabs 문자단위) > words(Whisper 단어단위) > durationMs 균등분배 근사.
 *
 * @param {object} params
 * @param {string} params.narration
 * @param {object|null} [params.alignment] - ElevenLabs with-timestamps 응답의 alignment
 * @param {Array<{text:string,startMs:number,endMs:number}>|null} [params.words] - Whisper 등에서 얻은 단어별 타임스탬프
 * @param {number|null} [params.durationMs] - alignment/words가 둘 다 없을 때 필요한 전체 음성 길이(ms)
 * @param {number} [params.wordsPerChunk] - 자막 한 컷에 들어갈 단어 수
 * @returns {Array<{text: string, startMs: number, endMs: number}>}
 */
export function buildCaptions({
  narration,
  alignment = null,
  words = null,
  durationMs = null,
  wordsPerChunk = 4,
}) {
  if (!narration || narration.trim().length === 0) {
    throw new Error('buildCaptions: narration이 비어있습니다.');
  }

  if (alignment) {
    return buildFromAlignment(alignment, wordsPerChunk);
  }

  if (words && words.length > 0) {
    return buildFromWords(words, wordsPerChunk);
  }

  if (!durationMs || durationMs <= 0) {
    throw new Error('buildCaptions: alignment/words가 없으면 durationMs가 필요합니다.');
  }
  return buildFromEvenSplit(narration, durationMs, wordsPerChunk);
}
