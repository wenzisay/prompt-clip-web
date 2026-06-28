/**
 * MV3 service worker —— 最小职责（决策 D2）
 *
 * 状态/文件读写全部留在 side panel（page context）；SW 仅做两件事：
 *   1. action 点击 → 打开 side panel
 *   2. side panel 请求 → 打开 picker tab（chrome.tabs.create）
 *
 * 注意：picker 完成回执（PICKER_DONE / PICKER_CANCELLED）由 picker.html
 * 直接 chrome.runtime.sendMessage 广播给 side panel，SW 不转发，避免消息循环。
 */

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[bg] setPanelBehavior failed:', err));

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('[bg] message:', msg && msg.type, 'from', sender.url);

  if (msg && msg.type === 'OPEN_PICKER') {
    chrome.tabs.create({ url: chrome.runtime.getURL('picker.html') });
    sendResponse({ ok: true });
    return false; // 同步响应
  }

  return false;
});
