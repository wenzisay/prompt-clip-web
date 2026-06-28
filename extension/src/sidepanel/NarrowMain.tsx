/**
 * 窄列主界面
 *
 * 结构：精简顶栏 + FilterTabs/PromptGrid（单列虚拟列表，窄列自适应）。
 * PromptGrid 内部已含 FilterTabs，且 useResponsiveColumnCount 在 < 376px 返回单列。
 * 详情/编辑由全局 DetailPanel（SideDrawer）承载，见 ExtensionApp。
 */
import { useState } from 'react';
import { PromptGrid } from '@/components/prompt';
import { NarrowTopBar } from './NarrowTopBar';
import { NarrowNavDrawer } from './NarrowNavDrawer';

export function NarrowMain() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <NarrowTopBar onOpenNav={() => setNavOpen(true)} />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
        <PromptGrid />
      </main>
      <NarrowNavDrawer isOpen={navOpen} onClose={() => setNavOpen(false)} />
    </div>
  );
}
