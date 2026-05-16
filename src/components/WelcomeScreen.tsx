/**
 * 欢迎界面
 *
 * 首次访问或未选择目录时显示
 */

import { useDirectoryPicker } from '@/hooks/useDirectoryPicker';

export function WelcomeScreen() {
  const { isSupported, isLoading, error, openDirectory } = useDirectoryPicker();

  // 浏览器不支持的情况
  if (!isSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="max-w-md p-8 bg-surface rounded-card shadow-card">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-3xl">
                auto_awesome
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">PromptClip</h1>
          <p className="text-center text-muted mb-6">
            个人 Prompt 管理工具
          </p>
          <div className="bg-surface-container rounded-lg p-4 border border-border">
            <p className="text-sm text-fg mb-2">
              <strong>浏览器不支持</strong>
            </p>
            <p className="text-sm text-muted">
              当前浏览器不支持文件系统 API，请使用以下浏览器之一：
            </p>
            <ul className="text-sm text-muted mt-2 list-disc list-inside">
              <li>Chrome 86+</li>
              <li>Edge 86+</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="max-w-md w-full mx-4">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center shadow-card">
            <span className="material-symbols-outlined text-white text-4xl">
              auto_awesome
            </span>
          </div>
        </div>

        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-fg mb-2">PromptClip</h1>
          <p className="text-muted text-lg">个人 Prompt 管理工具</p>
        </div>

        {/* 说明卡片 */}
        <div className="bg-surface rounded-card p-6 shadow-card mb-6">
          <h2 className="font-semibold text-fg mb-3">开始使用</h2>
          <p className="text-muted text-sm mb-4">
            选择一个本地文件夹来存储你的 Prompts。所有数据都保存在本地，不会上传到任何服务器。
          </p>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          {/* 选择目录按钮 */}
          <button
            onClick={() => openDirectory()}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-accent text-white rounded-lg font-medium
              hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-xl">
                  refresh
                </span>
                <span>加载中...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">
                  folder_open
                </span>
                <span>选择数据目录</span>
              </>
            )}
          </button>
        </div>

        {/* 特性说明 */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-surface rounded-lg p-3">
            <span className="material-symbols-outlined text-accent text-2xl mb-1">
              lock
            </span>
            <p className="text-xs text-muted">本地存储</p>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <span className="material-symbols-outlined text-secondary text-2xl mb-1">
              speed
            </span>
            <p className="text-xs text-muted">快速访问</p>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <span className="material-symbols-outlined text-tertiary text-2xl mb-1">
              description
            </span>
            <p className="text-xs text-muted">Markdown</p>
          </div>
        </div>
      </div>
    </div>
  );
}
