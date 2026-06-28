/**
 * side panel —— 命门验证主控
 *
 * IndexedDB 约定与 src/services/fileRepository/webFileRepository.ts 完全一致：
 *   DB = promptclip-file-handles / store = handles / key = directory
 * 这样可直接验证「picker tab 写入 → side panel 读回」的复用前提。
 */

const DB_NAME = 'promptclip-file-handles';
const STORE_NAME = 'handles';
const DIRECTORY_KEY = 'directory';

const logEl = document.getElementById('log');
function log(text) {
  const line = `[${new Date().toLocaleTimeString()}] ${text}`;
  logEl.textContent += line + '\n';
  logEl.scrollTop = logEl.scrollHeight;
  console.log(text);
}
log('side panel ready.');

// ---- IndexedDB helpers（复刻 webFileRepository 的存取逻辑）----
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

function getSavedHandle() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const getReq = tx.objectStore(STORE_NAME).get(DIRECTORY_KEY);
      getReq.onsuccess = () => { db.close(); resolve(getReq.result || null); };
      getReq.onerror = () => { db.close(); reject(getReq.error); };
    };
    req.onerror = () => reject(req.error);
  });
}

function clearHandle() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(DIRECTORY_KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
    req.onerror = () => reject(req.error);
  });
}

// ---- ① side panel 直接调 picker（预期 AbortError，#314）----
document.getElementById('btn-direct').addEventListener('click', async () => {
  log('① side panel 直接调用 showDirectoryPicker()...');
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    log(`  ⚠️ 意外成功（picker 可在 side panel 直调了）：${handle.name}`);
    log('  → 若此处成功，则正式迁移可省去 tab 方案，直接复用 webFileRepository.selectDirectory。');
  } catch (e) {
    // 这是当前预期路径：扩展上下文无法满足 transient user activation
    log(`  ❌ 失败（符合 #314 预期）：${e.name}: ${e.message}`);
  }
});

// ---- ② 通过 tab 选目录（预期成功）----
document.getElementById('btn-tab').addEventListener('click', () => {
  log('② 请求 service worker 打开 picker tab...');
  chrome.runtime.sendMessage({ type: 'OPEN_PICKER' }, (resp) => {
    if (chrome.runtime.lastError) {
      log(`  ⚠️ 发送失败：${chrome.runtime.lastError.message}`);
    } else {
      log('  → 已请求开 tab，请在新打开的 tab 中点击「选择目录」。');
    }
  });
});

// 监听 picker 回执
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg) return;
  if (msg.type === 'PICKER_DONE') {
    log(`  ✅ picker tab 完成：${msg.name}。自动执行 ③ 读写验证...`);
    testReadWrite();
  } else if (msg.type === 'PICKER_CANCELLED') {
    log(`  ⚠️ picker 取消/失败：${msg.error || ''} ${msg.message || ''}`);
  }
});

// ---- ③ restoreDirectory 闭环 + 读写验证（复用 webFileRepository 的前提）----
async function testReadWrite() {
  try {
    const handle = await getSavedHandle();
    if (!handle) {
      log('  ❌ IndexedDB 无 handle（picker 未写入或跨上下文不共享）');
      return;
    }
    log(`  ✅ restoreDirectory 成功：${handle.name}（跨上下文 IndexedDB 共享 OK）`);

    // 权限续期（与 webFileRepository.verifyPermission 一致）
    let perm = await handle.queryPermission({ mode: 'readwrite' });
    log(`  queryPermission → ${perm}`);
    if (perm !== 'granted') {
      perm = await handle.requestPermission({ mode: 'readwrite' });
      log(`  requestPermission → ${perm}`);
    }

    // listFiles：遍历目录取 .md
    const mdFiles = [];
    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.md')) {
        mdFiles.push(entry.name);
      }
    }
    const preview = mdFiles.slice(0, 5).join(', ');
    log(`  ✅ listFiles：找到 ${mdFiles.length} 个 .md${mdFiles.length ? '（' + preview + (mdFiles.length > 5 ? '…' : '') + '）' : ''}`);

    // readText：读第一个（若有）
    if (mdFiles[0]) {
      const fh = await handle.getFileHandle(mdFiles[0]);
      const file = await fh.getFile();
      const head = (await file.text()).slice(0, 60).replace(/\n/g, ' ');
      log(`  ✅ readText：${mdFiles[0]} 前 60 字 = "${head}"`);
    }

    // writeText：写一个测试文件（验证 createWritable 在 side panel 可用）
    const testFh = await handle.getFileHandle('__spike_test__.md', { create: true });
    const writable = await testFh.createWritable();
    await writable.write('# spike test\nwritten from side panel\n');
    await writable.close();
    log('  ✅ writeText：写入 __spike_test__.md 成功');

    log('  ── 结论：tab 方案打通了「选目录→持久化→side panel 读写」闭环 ──');
  } catch (e) {
    log(`  ❌ 读写验证失败：${e.name}: ${e.message}`);
  }
}

document.getElementById('btn-rw').addEventListener('click', () => {
  log('③ 手动触发读写验证...');
  testReadWrite();
});

document.getElementById('btn-clear').addEventListener('click', async () => {
  await clearHandle();
  log('④ 已清空 IndexedDB 中的 handle。');
});
