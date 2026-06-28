/**
 * MV3 service worker —— 最小职责（决策 D2）
 *
 * 状态/文件读写全部留在 side panel（page context）；SW 仅负责：
 *   action 点击 → 打开 side panel
 *
 * 注意：#314 已修复，side panel 内可直接调用 showDirectoryPicker（spike 实测），
 * 故无需 picker tab 中转、无需消息协议。
 */

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[PromptClip] setPanelBehavior failed:', err));
