import { searchNaverNews } from './naverNews.js';

/**
 * 주제 하나만 받아서 네이버 뉴스 검색으로 관련 기사를 모으고, 대본 생성 재료로 쓸
 * 하나의 리서치 문서(텍스트)로 합친다. "인터넷 조사로 대본 만들기" 기능의 핵심.
 * @param {string} topic
 * @returns {Promise<{text: string, sources: {title:string, link:string}[]}>}
 */
export async function researchTopic(topic) {
  const { items } = await searchNaverNews({ query: topic, display: 8, sort: 'sim' });
  if (!items.length) {
    throw new Error(`"${topic}"에 대한 관련 기사를 찾지 못했습니다. 다른 주제로 시도해보세요.`);
  }

  const text = [
    `주제: ${topic}`,
    '',
    '아래는 이 주제에 대한 최신 뉴스 기사 요약 모음이다.',
    ...items.map((it, i) => `${i + 1}. ${it.title}\n${it.description}`),
  ].join('\n\n');

  return {
    text,
    sources: items.map((it) => ({ title: it.title, link: it.link })),
  };
}
