// 대본 내용에 맞는 스톡영상을 자동으로 찾아서 후보로 보여주는 기능.
// Pexels 무료 API 사용(상업적 사용 가능). 검색어는 영어일 때 결과가 훨씬 좋아서
// 대본을 그대로 검색하지 않고, Gemini로 짧은 영어 키워드 몇 개를 먼저 뽑는다.

const GEMINI_MODEL = 'gemini-2.5-flash';

async function extractKeywordsWithGemini({ titleLine1, titleLine2, narration }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = [
    '아래는 9:16 세로 쇼츠 영상의 제목과 내레이션이다.',
    '이 영상 배경으로 쓸 스톡영상을 검색할 때 쓸 영어 키워드 3개를 뽑아라.',
    '키워드는 명사 위주 1~2단어의 짧은 영어 검색어여야 하고, 실제 스톡영상 사이트(Pexels)에서 검색 결과가 잘 나올 만한 일반적인 단어로 골라라.',
    '반드시 아래 JSON 배열만 출력한다. 다른 설명은 절대 포함하지 않는다.',
    '["keyword1", "keyword2", "keyword3"]',
    '',
    `제목: ${titleLine1} ${titleLine2 || ''}`,
    `내레이션: ${narration.slice(0, 500)}`,
  ].join('\n');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );
  if (!res.ok) return null;

  const json = await res.json();
  const rawText = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  try {
    const parsed = JSON.parse(rawText.trim());
    if (Array.isArray(parsed) && parsed.length) return parsed.slice(0, 3).map(String);
  } catch {
    // 아래 폴백으로 넘어감
  }
  return null;
}

/**
 * 제목/내레이션에서 스톡영상 검색용 영어 키워드를 뽑는다.
 * Gemini 키가 없거나 실패하면 제목을 그대로 폴백 키워드로 쓴다.
 */
export async function suggestKeywords({ titleLine1, titleLine2, narration }) {
  const keywords = await extractKeywordsWithGemini({ titleLine1, titleLine2, narration }).catch(() => null);
  if (keywords?.length) return keywords;
  return [titleLine1].filter(Boolean);
}

/**
 * Pexels Video API로 키워드 하나당 스톡영상 후보를 검색한다.
 * @param {string[]} keywords
 * @param {number} perKeyword - 키워드당 가져올 개수
 */
export async function searchStockVideos(keywords, perKeyword = 4) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error('PEXELS_API_KEY가 설정되어 있지 않습니다.');

  const results = [];
  for (const keyword of keywords) {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}&per_page=${perKeyword}&orientation=portrait`,
      { headers: { Authorization: apiKey } }
    );
    if (!res.ok) continue;
    const data = await res.json();
    for (const video of data.videos || []) {
      // 세로 영상 파일 중 화질이 가장 좋은 것 하나만 고른다(전체 파일 목록을 다 내려주면 너무 무거움).
      const files = (video.video_files || []).filter((f) => f.width && f.height && f.height >= f.width);
      const best = files.sort((a, b) => (b.width || 0) - (a.width || 0))[0] || video.video_files?.[0];
      if (!best) continue;
      results.push({
        id: video.id,
        keyword,
        thumbnail: video.image,
        videoUrl: best.link,
        width: best.width,
        height: best.height,
        duration: video.duration,
        photographer: video.user?.name,
      });
    }
  }
  return results;
}
