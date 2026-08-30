/**
 * Google Flow(labs.google/fx/tools/flow)를 puppeteer-core로 직접 조작해서 이미지를 생성한다.
 * 유쓰레드 워커(worker/collectBenchmark.js)+벤치마킹 항목 "nam-ai-trend/7_threads_auto"를
 * 참고해서 만들었으나, 그대로 puppeteer.launch()를 썼다가 실패해서(2026-08-30) 구조를 고쳤다:
 *
 * ⚠️ puppeteer.launch()는 크롬을 "자동화 모드"로 새로 실행한다(--enable-automation 플래그가
 * 자동으로 붙음) — 그러면 크롬 상단에 "자동화된 테스트 소프트웨어에 의해 제어되고 있습니다"
 * 배너가 뜨고, navigator.webdriver가 true가 된다. 구글은 로그인 시점에 바로 이걸 감지해서
 * 아예 로그인을 거부한다(실제로 재현됨: "로그인할 수 없음 — 브라우저 또는 앱이 안전하지
 * 않을 수 있습니다"). 로그인해둔 프로필 폴더를 그대로 넘겨도 소용없었다 — 자동화로 켜진
 * 세션 자체를 구글이 계속 로그아웃 취급하는 것으로 보임.
 *
 * ✅ 해결책 — launch 대신 connect: 크롬을 puppeteer로 "실행"하지 않고, 그냥 일반 프로세스로
 * (`--remote-debugging-port`만 열어서) 실행한 뒤, puppeteer는 거기에 "연결"만 한다.
 * 이 방식은 크롬이 스스로를 "자동화됨"으로 표시하지 않는다(--enable-automation을 안 붙이므로).
 * 벤치마킹 항목 "nam-ai-trend/7_threads_auto"가 실제로 쓰는 방식이 이것 — Playwright가
 * "로컬 크롬(디버깅포트 9222)에 CDP로 붙는다"고 한 게 바로 이 launch-vs-connect 차이였다.
 *
 * - 텍스트 입력은 한 글자씩 타이핑하지 않고, 클립보드에 써넣은 뒤 Ctrl+V로 붙여넣는다.
 *   유쓰레드 팀이 실전에서 확인한 것: "한 글자씩 타이핑하면 봇 특유의 일정한 리듬이 감지된다."
 * - 최초 실행 시 로그인이 안 되어 있으면, 화면이 보이는 채로(headless 아님) 5분간 사용자의
 *   수동 로그인을 기다린다. 한 번 로그인하면 프로필 폴더에 저장돼서 다음부터는 유지된다.
 */
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];

function findChrome() {
  const found = CHROME_PATHS.find((p) => fs.existsSync(p));
  if (!found) throw new Error('설치된 크롬을 찾지 못했습니다(CHROME_PATHS 확인 필요).');
  return found;
}

const PROFILE_DIR = path.join(os.homedir(), '.u-short-worker', 'chrome-profile-flow');
const DEBUG_PORT = 9222;
const LOGIN_WAIT_MS = 5 * 60 * 1000;
const GENERATION_TIMEOUT_MS = 90 * 1000;

let currentBrowser = null;
let currentChromeProc = null;

async function waitForDebugPort(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return true;
    } catch {
      // 아직 안 떴음 — 재시도.
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function getOrLaunchBrowser() {
  if (currentBrowser && currentBrowser.connected) return currentBrowser;

  // 크롬을 puppeteer가 "실행"하지 않고, 일반 프로세스로 직접 띄운다 — --enable-automation이
  // 안 붙어서 크롬이 스스로를 자동화됨으로 표시하지 않는다.
  const executablePath = findChrome();
  currentChromeProc = spawn(
    executablePath,
    [`--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${PROFILE_DIR}`, '--no-first-run', '--no-default-browser-check'],
    { detached: true, stdio: 'ignore' }
  );
  currentChromeProc.unref();

  const ready = await waitForDebugPort(DEBUG_PORT);
  if (!ready) throw new Error(`크롬 디버깅 포트(${DEBUG_PORT})가 안 열렸습니다.`);

  currentBrowser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${DEBUG_PORT}` });
  return currentBrowser;
}

export async function closeFlowBrowser() {
  if (currentBrowser) {
    try {
      currentBrowser.disconnect();
    } catch {
      // 이미 끊어졌으면 무시.
    }
    currentBrowser = null;
  }
  const proc = currentChromeProc;
  currentChromeProc = null;
  if (proc && proc.exitCode === null && !proc.killed) {
    try {
      proc.kill();
    } catch {
      // 프로세스가 이미 종료된 경우 등 — 무시.
    }
  }
}

async function pasteIntoEditor(page, editorHandle, text) {
  await editorHandle.click();
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await new Promise((r) => setTimeout(r, 200));

  const origin = new URL(page.url()).origin;
  try {
    await page.browser().defaultBrowserContext().overridePermissions(origin, ['clipboard-read', 'clipboard-write']);
  } catch (err) {
    console.log('[flowBrowserAutomation] 클립보드 권한 부여 실패(무시하고 계속):', err.message);
  }

  const wroteToClipboard = await page
    .evaluate((t) => navigator.clipboard.writeText(t).then(() => true).catch(() => false), text)
    .catch(() => false);

  if (!wroteToClipboard) {
    // Async Clipboard API가 막히면(권한/브라우저 버전 이슈), execCommand('copy') 방식으로 폴백한다 —
    // 임시 textarea에 값을 넣고 선택한 뒤 복사하는, 훨씬 오래되고 덜 까다로운 방법.
    await page.evaluate((t) => {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }, text);
  }
  await editorHandle.click(); // 폴백 경로에서 임시 textarea로 포커스가 옮겨갔을 수 있어 다시 잡아준다.
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyV');
  await page.keyboard.up('Control');
  await new Promise((r) => setTimeout(r, 500));
}

async function findSubmitButtonHandle(page) {
  const handle = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find((b) => !b.disabled && (b.innerText || '').includes('arrow_forward')) || null;
  });
  const el = handle.asElement();
  return el;
}

async function waitForResult(page, timeoutMs = GENERATION_TIMEOUT_MS) {
  const beforeSrcs = await page.evaluate(() => Array.from(document.querySelectorAll('img')).map((img) => img.src));
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const check = await page.evaluate((before) => {
      const errorEl = Array.from(document.querySelectorAll('*')).find(
        (el) =>
          el.children.length === 0 &&
          el.tagName !== 'SCRIPT' &&
          el.tagName !== 'STYLE' &&
          (el.textContent || '').length < 300 &&
          /Something went wrong|Prompt must be provided/i.test(el.textContent || '')
      );
      if (errorEl) return { error: errorEl.textContent.trim().slice(0, 200) };
      const newImg = Array.from(document.querySelectorAll('img')).find(
        (img) => img.src.includes('getMediaUrlRedirect') && !before.includes(img.src) && img.naturalWidth > 100
      );
      return { newSrc: newImg ? newImg.src : null };
    }, beforeSrcs);
    if (check.error) throw new Error(check.error);
    if (check.newSrc) return check.newSrc;
  }
  throw new Error(`생성 대기 타임아웃(${timeoutMs / 1000}초)`);
}

async function downloadImageAsBuffer(page, src) {
  const base64 = await page.evaluate(async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, src);
  return Buffer.from(base64, 'base64');
}

/**
 * @param {object} params
 * @param {string} params.prompt
 * @param {string} params.projectUrl - labs.google/fx/tools/flow/project/<id> 형식
 * @returns {Promise<Buffer>} 생성된 이미지의 바이너리(PNG/JPEG)
 */
export async function generateImageWithFlowBrowser({ prompt, projectUrl }) {
  if (!prompt || !prompt.trim()) throw new Error('generateImageWithFlowBrowser: prompt가 비어있습니다.');
  if (!projectUrl) throw new Error('generateImageWithFlowBrowser: projectUrl이 필요합니다.');

  const browser = await getOrLaunchBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));

    let editorHandle = (await page.evaluateHandle(() => document.querySelector('[data-slate-editor="true"]'))).asElement();
    if (!editorHandle) {
      console.log('[flowBrowserAutomation] 로그인이 안 되어 있는 것 같습니다 — 뜬 크롬 창에서 직접 로그인해주세요 (최대 5분 대기, 한 번만 하면 이후엔 유지됩니다).');
      const deadline = Date.now() + LOGIN_WAIT_MS;
      while (Date.now() < deadline && !editorHandle) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          editorHandle = (await page.evaluateHandle(() => document.querySelector('[data-slate-editor="true"]'))).asElement();
        } catch {
          editorHandle = null;
        }
      }
      if (!editorHandle) throw new Error('로그인 대기 시간(5분) 초과, 또는 프롬프트 입력창을 찾지 못했습니다.');
      console.log('[flowBrowserAutomation] 로그인 확인됨 — 생성을 시작합니다.');
    }

    await pasteIntoEditor(page, editorHandle, prompt);

    const submitBtn = await findSubmitButtonHandle(page);
    if (!submitBtn) throw new Error('제출 버튼을 찾지 못했습니다.');
    await submitBtn.click();

    const resultSrc = await waitForResult(page);
    return await downloadImageAsBuffer(page, resultSrc);
  } finally {
    await page.close().catch(() => {});
  }
}
