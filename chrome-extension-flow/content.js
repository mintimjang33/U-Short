// labs.google/fx/tools/flow 페이지에 주입되는 콘텐츠 스크립트.
//
// **반자동 구조**(2026-08-30, 라이브 테스트로 확정): 프롬프트 자동 입력 → 생성 버튼은
// 사용자가 직접 클릭 → 완료 감지·다운로드·서버 업로드는 다시 자동.
//
// 왜 완전자동이 아닌가: Flow의 "생성" 버튼은 진짜 사용자 클릭(isTrusted 이벤트)인지 검사한다.
// 실제로 재현 테스트해서 확인함 — 스크립트로 만든 pointerdown/mousedown/click 이벤트를 그대로
// 이 버튼에 쐈더니 네트워크 요청 자체가 안 나갔고(콘솔로 실제 확인), 반면 진짜 마우스 클릭이나
// 진짜 키보드 Enter는 정상적으로 생성 요청을 보냈다. 이걸 억지로 뚫으려면 chrome.debugger로
// OS 수준 입력을 흉내내야 하는데, 그러면 크롬에 "이 확장 프로그램이 브라우저를 디버깅 중"이라는
// 경고 배너가 계속 뜨고 리스크도 커서 채택하지 않았다. 대신 텍스트 자동입력 + 완료 후 자동수거만
// 하고, 마지막 클릭 한 번만 사용자가 하는 반자동으로 설계함(유쓰레드 draft-queue와 같은 패턴).
//
// 확인된 실제 DOM 구조:
// - 프롬프트 입력창: [data-slate-editor="true"] (Slate.js). 텍스트 입력은 반드시 문자 하나마다
//   InputEvent('beforeinput')를 먼저 쏘고 execCommand('insertText')로 그 한 글자만 넣어야
//   Slate 내부 상태에 반영된다(한 번에 통짜로 넣으면 화면엔 보여도 제출 시 빈 값으로 처리됨 —
//   라이브로 재현 확인함).
// - 완료된 이미지: <img src="https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?..."> 로
//   그리드에 나타난다. 로그인 세션 쿠키로 그대로 fetch 가능(같은 origin).
//
// waitForResult()의 MutationObserver 로직 자체는 이 파일 형태 그대로 라이브 테스트하지
// 않았다 — 처음 설치 후 완료 감지가 안 되면 이 부분부터 콘솔 로그로 점검할 것.

function findEditor() {
  return document.querySelector('[data-slate-editor="true"]');
}

function findSubmitButton() {
  const buttons = Array.from(document.querySelectorAll('button'));
  return buttons.find((b) => !b.disabled && (b.innerText || '').includes('arrow_forward'));
}

function clearEditor(editor) {
  editor.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('delete', false, null);
}

async function insertViaKeyEvents(editor, text) {
  clearEditor(editor);
  editor.focus();
  for (const ch of text) {
    editor.dispatchEvent(new InputEvent('beforeinput', { data: ch, inputType: 'insertText', bubbles: true, cancelable: true }));
    document.execCommand('insertText', false, ch);
    await new Promise((r) => setTimeout(r, 8));
  }
  await new Promise((r) => setTimeout(r, 300));
}

async function insertViaPaste(editor, text) {
  clearEditor(editor);
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 300));
}

async function insertPrompt(editor, text) {
  await insertViaKeyEvents(editor, text);
  if ((editor.innerText || '').includes(text)) return true;
  await insertViaPaste(editor, text);
  return (editor.innerText || '').includes(text);
}

// 사용자가 눈치채도록 제출 버튼 근처에 배너를 띄운다. 버튼 자체를 흔들리게(pulse) 해서
// 시선을 끈다 — 클릭은 여기서 하지 않고 사용자의 실제 클릭을 기다린다.
function showClickMePrompt() {
  const existing = document.getElementById('ushort-flow-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'ushort-flow-banner';
  banner.textContent = '유쇼츠: 프롬프트 입력 완료! 생성 버튼을 눌러주세요 →';
  Object.assign(banner.style, {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 999999,
    background: '#2563eb',
    color: 'white',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  });
  document.body.appendChild(banner);

  const btn = findSubmitButton();
  let pulseInterval = null;
  if (btn) {
    const styleTag = document.createElement('style');
    styleTag.id = 'ushort-flow-pulse-style';
    styleTag.textContent = `
      @keyframes ushort-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.7); } 50% { box-shadow: 0 0 0 8px rgba(37,99,235,0); } }
      .ushort-flow-pulse { animation: ushort-pulse 1.2s infinite; border-radius: 50% !important; }
    `;
    document.head.appendChild(styleTag);
    btn.classList.add('ushort-flow-pulse');
  }
  return () => {
    banner.remove();
    if (btn) btn.classList.remove('ushort-flow-pulse');
    document.getElementById('ushort-flow-pulse-style')?.remove();
  };
}

function waitForResult({ timeoutMs = 10 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    const seenImages = new Set(Array.from(document.querySelectorAll('img')).map((img) => img.src));
    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error('10분 동안 생성 완료가 감지되지 않았습니다(버튼을 못 누르셨거나 생성이 안 된 것 같습니다).'));
    }, timeoutMs);

    const check = () => {
      const errorEl = Array.from(document.querySelectorAll('*')).find(
        (el) =>
          el.children.length === 0 &&
          el.tagName !== 'SCRIPT' &&
          el.tagName !== 'STYLE' &&
          (el.textContent || '').length < 300 &&
          /Something went wrong|Prompt must be provided/i.test(el.textContent || '')
      );
      if (errorEl) {
        clearTimeout(timer);
        observer.disconnect();
        reject(new Error(errorEl.textContent.trim().slice(0, 200)));
        return;
      }
      const newImg = Array.from(document.querySelectorAll('img')).find(
        (img) => img.src.includes('getMediaUrlRedirect') && !seenImages.has(img.src) && img.naturalWidth > 100
      );
      if (newImg) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(newImg.src);
      }
    };

    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    check();
  });
}

async function imageUrlToBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`이미지 다운로드 실패 (${res.status})`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function reportResult(apiBase, token, taskId, payload) {
  await fetch(`${apiBase}/api/extension/flow-tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

// background.js가 작업을 던져주면 여기서 프롬프트 입력 + 배너 표시까지만 하고 바로
// 응답한다(대기는 여기서 비동기로 계속하되, service worker가 잠들어도 상관없도록
// 완료 시점엔 background를 거치지 않고 이 콘텐츠 스크립트가 서버로 직접 보고한다).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'GENERATE') return false;

  (async () => {
    const { apiBase, token, taskId, prompt } = message;
    try {
      const editor = findEditor();
      if (!editor) throw new Error('프롬프트 입력창을 찾지 못했습니다(Flow 프로젝트 화면이 맞는지 확인).');

      const inserted = await insertPrompt(editor, prompt);
      if (!inserted) throw new Error('프롬프트 입력에 실패했습니다(Slate 에디터 상태 미반영).');

      const removeBanner = showClickMePrompt();
      sendResponse({ ok: true, waiting: true }); // background에게는 "입력 완료, 사용자 응답 대기 중"만 바로 알림.

      try {
        const resultSrc = await waitForResult();
        const imageBase64 = await imageUrlToBase64(resultSrc);
        await reportResult(apiBase, token, taskId, { status: 'completed', imageBase64 });
      } catch (err) {
        await reportResult(apiBase, token, taskId, { status: 'failed', error: String(err?.message || err) });
      } finally {
        removeBanner();
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
      await reportResult(apiBase, token, taskId, { status: 'failed', error: String(err?.message || err) });
    }
  })();

  return true;
});
