const apiBaseInput = document.getElementById('apiBase');
const tokenInput = document.getElementById('token');
const flowProjectUrlInput = document.getElementById('flowProjectUrl');
const statusEl = document.getElementById('status');

chrome.storage.local.get(['apiBase', 'token', 'flowProjectUrl'], ({ apiBase, token, flowProjectUrl }) => {
  if (apiBase) apiBaseInput.value = apiBase;
  if (token) tokenInput.value = token;
  if (flowProjectUrl) flowProjectUrlInput.value = flowProjectUrl;
});

document.getElementById('save').addEventListener('click', async () => {
  const apiBase = apiBaseInput.value.trim().replace(/\/$/, '');
  const token = tokenInput.value.trim();
  const flowProjectUrl = flowProjectUrlInput.value.trim();
  if (!apiBase || !token || !flowProjectUrl) {
    statusEl.style.color = '#dc2626';
    statusEl.textContent = 'API 주소, 토큰, Flow 프로젝트 URL을 모두 입력하세요.';
    return;
  }

  statusEl.style.color = '#555';
  statusEl.textContent = '연결 확인 중...';

  try {
    const res = await fetch(`${apiBase}/api/extension/flow-tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await chrome.storage.local.set({ apiBase, token, flowProjectUrl });
    statusEl.style.color = '#16a34a';
    statusEl.textContent = '연결 성공! 백그라운드에서 자동으로 작업을 확인합니다. (Flow 프로젝트 탭은 생성 중 건드리지 마세요)';
  } catch (err) {
    statusEl.style.color = '#dc2626';
    statusEl.textContent = `연결 실패: ${err.message}`;
  }
});
