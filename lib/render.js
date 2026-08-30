import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENTRY_POINT = path.join(__dirname, '..', 'remotion', 'src', 'index.js');

// 같은 프로세스 안에서는 번들을 재사용한다 (Next.js 서버가 떠 있는 동안 매 요청마다
// 다시 번들링하지 않도록). Remotion 서버사이드 렌더링은 로컬 절대경로(file://)를
// 에셋으로 못 읽으므로, audioSrc/backgroundImageUrl은 반드시 http(s) URL이어야 한다 —
// 그래서 파이프라인에서 TTS로 만든 음성도 렌더 전에 먼저 Supabase Storage에 업로드해
// 공개 URL을 받은 뒤 이 함수에 넘긴다 (lib/render.js는 URL만 다룬다).
let cachedBundleUrlPromise = null;
function getBundle() {
  if (!cachedBundleUrlPromise) {
    // 번들링이 실패하면(예: esbuild 내부 서비스가 죽는 등 일시적 문제) 캐시를 비워서 다음
    // 호출이 새로 번들링을 시도하게 한다 — 실제로 이 문제를 겪음: 캐시를 안 비우면
    // 워커 프로세스를 재시작하기 전까지 이후의 모든 렌더링 요청이 똑같은 에러로 영원히
    // 실패했다(거부된 Promise가 그대로 캐시에 남아있었기 때문).
    cachedBundleUrlPromise = bundle({ entryPoint: ENTRY_POINT }).catch((err) => {
      cachedBundleUrlPromise = null;
      throw err;
    });
  }
  return cachedBundleUrlPromise;
}

/**
 * Remotion 컴포지션을 실제 mp4로 렌더링한다. 헤드리스 Chromium은 Remotion이 내부적으로
 * 관리하므로 별도 브라우저/서버 설치가 필요 없다.
 *
 * @param {object} params
 * @param {'InfoLayout'|'CardLayout'} params.compositionId
 * @param {object} params.inputProps - Root.jsx의 defaultCompositionProps와 같은 shape.
 *   audioSrc/backgroundImageUrl은 http(s) URL만 지원한다(로컬 파일 경로 불가).
 * @param {string} params.outputLocation - 저장할 mp4 절대경로
 */
export async function renderShort({ compositionId, inputProps, outputLocation }) {
  const serveUrl = await getBundle();

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation,
    inputProps,
  });

  return outputLocation;
}

/**
 * 인스타툰 1컷을 배경 이미지+캡션 텍스트를 합성한 정지 PNG로 렌더링한다.
 * AI 이미지 생성 프롬프트에 텍스트를 굽는 대신, 실제 폰트로 렌더링해서 한글이 깨지지 않게 한다
 * (renderMedia 대신 renderStill 사용 — 영상이 아니라 프레임 1장이라 훨씬 가볍고 빠르다).
 *
 * @param {object} params
 * @param {string} params.backgroundImageUrl - http(s) URL (로컬 파일 경로 불가)
 * @param {string} params.text - 말풍선 캡션
 * @param {string} params.outputLocation - 저장할 png 절대경로
 */
export async function renderInstatoonPanel({ backgroundImageUrl, text, outputLocation }) {
  const serveUrl = await getBundle();
  const inputProps = { backgroundImageUrl, text };

  const composition = await selectComposition({
    serveUrl,
    id: 'InstatoonPanel',
    inputProps,
  });

  await renderStill({
    composition,
    serveUrl,
    output: outputLocation,
    inputProps,
  });

  return outputLocation;
}

/**
 * 카드뉴스 1장을 배경 이미지+제목+본문 텍스트를 합성한 정지 PNG로 렌더링한다.
 * renderInstatoonPanel과 같은 이유(한글 렌더 안정성)로 renderStill을 쓴다.
 *
 * @param {object} params
 * @param {string} params.backgroundImageUrl
 * @param {string} params.title
 * @param {string} params.text
 * @param {'cover'|'body'|'summary'} params.type
 * @param {string} params.outputLocation - 저장할 png 절대경로
 */
export async function renderCardnewsPanel({ backgroundImageUrl, title, text, type, outputLocation }) {
  const serveUrl = await getBundle();
  const inputProps = { backgroundImageUrl, title, text, type };

  const composition = await selectComposition({
    serveUrl,
    id: 'CardNewsPanel',
    inputProps,
  });

  await renderStill({
    composition,
    serveUrl,
    output: outputLocation,
    inputProps,
  });

  return outputLocation;
}
