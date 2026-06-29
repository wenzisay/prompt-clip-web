/**
 * 快速搜索浮窗环境判断工具
 */

/**
 * 判断给定 URL search 字符串是否表示快速搜索浮窗窗口。
 *
 * 浮窗窗口通过 tauri.conf.json 的 `url: "index.html?window=quick-search"` 加载，
 * 与主窗口共用同一份前端 dist，靠此 query 参数区分渲染哪个根组件。
 */
export function isQuickSearchWindowLocation(search: string): boolean {
  if (!search) {
    return false;
  }
  return new URLSearchParams(search).get('window') === 'quick-search';
}
