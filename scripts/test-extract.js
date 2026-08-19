import { extractBlogContent } from '../lib/extract.js';

const urls = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'https://blog.naver.com/naver_diary/223300000000', // 예시(존재하지 않을 수 있음) — 실제 URL을 인자로 넘기는 걸 권장
    ];

for (const url of urls) {
  console.log(`\n=== ${url} ===`);
  try {
    const result = await extractBlogContent(url);
    console.log('title:', result.title);
    console.log('text length:', result.text.length);
    console.log('text preview:', result.text.slice(0, 200).replace(/\n/g, ' '));
    console.log('images:', result.images.slice(0, 3));
  } catch (err) {
    console.error('FAILED:', err.message);
  }
}
