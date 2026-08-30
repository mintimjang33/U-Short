// 반자동 구조: 여기선 "새 작업이 있는지 폴링 → Flow 탭에 프롬프트를 자동으로 넣어두기"까지만
// 담당한다. 그 이후(사용자의 실제 클릭 대기 → 완료 감지 → 서버 보고)는 content.js가 이
// background(서비스 워커, MV3라 유휴 시 꺼질 수 있음)를 거치지 않고 직접 서버와 통신한다.
const POLL_INTERVAL_MS = 6000;
let busy = false;

async function getConfig() {
  const { apiBase, token, flowProjectUrl } = await chrome.storage.local.get(['apiBase', 'token', 'flowProjectUrl']);
  return { apiBase, token, flowProjectUrl };
}

async function findOrOpenFlowTab(flowProjectUrl) {
  const tabs = await chrome.tabs.query({ url: 'https://labs.google/fx/tools/flow/project/*' });
  if (tabs.length > 0) return tabs[0];
  const created = await chrome.tabs.create({ url: flowProjectUrl, active: true });
  await new Promise((r) => setTimeout(r, 6000));
  return created;
}

async function reportResult(apiBase, token, taskId, payload) {
  await fetch(`${apiBase}/api/extension/flow-tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

async function pollOnce() {
  if (busy) return;
  const { apiBase, token, flowProjectUrl } = await getConfig();
  if (!apiBase || !token || !flowProjectUrl) return;

  let res;
  try {
    res = await fetch(`${apiBase}/api/extension/flow-tasks`, { headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    console.error('[유쇼츠 Flow 확장] 폴링 실패(네트워크):', err);
    return;
  }
  if (!res.ok) return;
  const { task } = await res.json();
  if (!task) return;

  busy = true;
  try {
    const tab = await findOrOpenFlowTab(flowProjectUrl);
    await chrome.tabs.update(tab.id, { active: true }); // 사용자가 바로 배너/버튼을 볼 수 있게 앞으로.
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'GENERATE',
      apiBase,
      token,
      taskId: task.id,
      prompt: task.prompt,
    });
    // response는 "프롬프트 입력 완료, 사용자 클릭 대기 중"만 의미한다 — 실제 완료 보고는
    // content.js가 직접 서버로 보낸다. 입력 자체가 실패했을 때만 여기서 실패 처리한다.
    if (!response || !response.ok) {
      await reportResult(apiBase, token, task.id, { status: 'failed', error: response?.error || '알 수 없는 오류(content script 응답 없음)' });
    }
  } catch (err) {
    console.error('[유쇼츠 Flow 확장] 작업 처리 실패:', err);
    await reportResult(apiBase, token, task.id, { status: 'failed', error: String(err?.message || err) });
  } finally {
    busy = false;
  }
}

setInterval(pollOnce, POLL_INTERVAL_MS);
pollOnce();
