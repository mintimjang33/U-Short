import * as cheerio from 'cheerio';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// "12,900원", "₩12,900", "12900" 등에서 숫자만 뽑는다.
function parsePriceNumber(raw) {
  if (raw === undefined || raw === null) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  if (!digits) return null;
  return Number(digits);
}

function formatPriceKRW(n) {
  if (n === null || Number.isNaN(n)) return null;
  return `${n.toLocaleString('ko-KR')}원`;
}

/**
 * 쇼핑몰 상품 페이지 URL에서 상품명/가격/이미지를 추출한다.
 * 1순위: JSON-LD Product 스키마(schema.org) — 쿠팡/스마트스토어 등 대부분의 국내 쇼핑몰이 지원.
 * 2순위: OG 메타태그 폴백(og:title, og:image, product:price:amount).
 * @param {string} rawUrl
 * @returns {Promise<{name: string, price: string|null, priceNumber: number|null, image: string|null, sourceUrl: string}>}
 */
export async function extractProductInfo(rawUrl) {
  const res = await fetch(rawUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    throw new Error(`상품 페이지 요청 실패 (${res.status} ${res.statusText}): ${rawUrl}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  // 1순위: JSON-LD Product 스키마
  let name = null;
  let priceNumber = null;
  let image = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (name && priceNumber) return;
    let json;
    try {
      json = JSON.parse($(el).contents().text());
    } catch {
      return;
    }
    const candidates = Array.isArray(json) ? json : json['@graph'] || [json];
    for (const item of candidates) {
      if (!item || typeof item !== 'object') continue;
      const type = item['@type'];
      const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
      if (!isProduct) continue;
      name = name || item.name || null;
      const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
      if (offers?.price) priceNumber = priceNumber || parsePriceNumber(offers.price);
      const img = Array.isArray(item.image) ? item.image[0] : item.image;
      image = image || img || null;
    }
  });

  // 2순위: OG 메타태그 폴백
  if (!name) {
    name = $('meta[property="og:title"]').attr('content')?.trim() || $('title').text().trim() || null;
  }
  if (!image) {
    image = $('meta[property="og:image"]').attr('content') || null;
  }
  if (!priceNumber) {
    const ogPrice =
      $('meta[property="product:price:amount"]').attr('content') ||
      $('meta[property="og:price:amount"]').attr('content');
    if (ogPrice) priceNumber = parsePriceNumber(ogPrice);
  }
  // 3순위: 본문 텍스트에서 "OO원" 패턴 중 가장 먼저 나오는 큰 숫자(휴리스틱, 실패해도 치명적이지 않음)
  if (!priceNumber) {
    const bodyText = $('body').text();
    const match = bodyText.match(/([\d,]{4,})\s*원/);
    if (match) priceNumber = parsePriceNumber(match[1]);
  }

  if (!name) {
    throw new Error('상품명을 추출하지 못했습니다. 이 페이지는 상품 URL 형식이 아니거나 접근이 차단됐을 수 있어요.');
  }

  return {
    name,
    price: formatPriceKRW(priceNumber),
    priceNumber,
    image,
    sourceUrl: rawUrl,
  };
}
