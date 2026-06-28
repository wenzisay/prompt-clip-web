/**
 * picker tab —— 在普通 page context 触发目录选择器
 *
 * 关键：showDirectoryPicker 需要 transient user activation，
 * 而 tab 导航后激活会丢失，因此必须由「按钮点击」触发，不能自动调用。
 */

const DB_NAME = 'promptclip-file-handles';
const STORE_NAME = 'handles';
const DIRECTORY_KEY = 'directory';

const btn = document.getElementById('pick');
const status = document.getElementById('status');

function setStatus(text, cls) {
  status.textContent = text;
  status.className = cls || '';
}

function saveHandle(handle) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, DIRECTORY_KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
    req.onerror = () => reject(req.error);
  });
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  setStatus('正在打开目录选择器…', '');
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });

    // 申请读写权限（与 webFileRepository.verifyPermission 一致）
    const perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      setStatus('权限被拒绝，请重试并允许读写。', 'err');
      chrome.runtime.sendMessage({ type: 'PICKER_CANCELLED', error: 'permission-denied' });
      btn.disabled = false;
      return;
    }

    // 持久化句柄 —— side panel 将从同一 IndexedDB 读回
    await saveHandle(handle);

    setStatus(`已选择：${handle.name}。可以关闭此页。`, 'ok');
    chrome.runtime.sendMessage({ type: 'PICKER_DONE', name: handle.name });
  } catch (e) {
    btn.disabled = false;
    if (e.name === 'AbortError') {
      setStatus('已取消选择。', 'err');
      chrome.runtime.sendMessage({ type: 'PICKER_CANCELLED', error: 'AbortError' });
    } else {
      setStatus(`失败：${e.name}: ${e.message}`, 'err');
      chrome.runtime.sendMessage({ type: 'PICKER_CANCELLED', error: e.name, message: e.message });
    }
  }
});
