import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function toNaverMobileUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (!url.hostname.includes('blog.naver.com')) return null;

  let blogId = url.searchParams.get('blogId');
  let logNo = url.searchParams.get('logNo');

  if (!blogId || !logNo) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      [blogId, logNo] = parts;
    }
  }
  if (!blogId || !logNo) return null;
  return `https://m.blog.naver.com/${blogId}/${logNo}`;
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    throw new Error(`본문 요청 실패 (${res.status} ${res.statusText}): ${url}`);
  }
  return res.text();
}

function isNonContentImage(src) {
  // 네이버 블로그 본문에는 지도/스티커 같은 배경으로 부적합한 이미지가 섞여 나온다.
  return /static\.map|storep-phinf|blogpfthumb|ssl\.pstatic\.net\/static/i.test(src);
}

function extractFromNaverMobile(html, baseUrl) {
  const $ = cheerio.load(html);

  const title = $('meta[property="og:title"]').attr('content')?.trim() || $('title').text().trim();

  const container = $('div.se-main-container');
  if (container.length === 0) return null;

  container.find('script, style').remove();
  const text = container
    .text()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

  if (!text || text.length < 30) return null;

  const images = [];
  container.find('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && !images.includes(src) && !isNonContentImage(src)) images.push(src);
  });

  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage && !isNonContentImage(ogImage) && !images.includes(ogImage)) images.unshift(ogImage);

  return { title, text, images: images.slice(0, 10), sourceUrl: baseUrl };
}

function extractWithReadability(html, baseUrl) {
  const dom = new JSDOM(html, { url: baseUrl });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent || article.textContent.trim().length < 30) {
    throw new Error('본문을 인식하지 못했습니다 (Readability 파싱 실패)');
  }

  const $ = cheerio.load(html);
  const images = [];
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) images.push(ogImage);
  $(article.content || '')
    .find?.('img')
    .each((_, el) => {
      const src = $(el).attr('src');
      if (src && !images.includes(src)) images.push(src);
    });

  return {
    title: article.title?.trim() || $('title').text().trim(),
    text: article.textContent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n'),
    images: images.slice(0, 10),
    sourceUrl: baseUrl,
  };
}

/**
 * 블로그 글 URL에서 제목/본문 텍스트/이미지 목록을 추출한다.
 * @param {string} rawUrl
 * @returns {Promise<{title: string, text: string, images: string[], sourceUrl: string}>}
 */
export async function extractBlogContent(rawUrl) {
  const mobileUrl = toNaverMobileUrl(rawUrl);
  const fetchUrl = mobileUrl || rawUrl;

  const html = await fetchHtml(fetchUrl);

  if (mobileUrl) {
    const naverResult = extractFromNaverMobile(html, rawUrl);
    if (naverResult) return naverResult;
    // 네이버 모바일 구조가 아니면(구버전 블로그 등) 범용 파서로 폴백
  }

  return extractWithReadability(html, fetchUrl);
}
