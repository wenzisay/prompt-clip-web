/**
 * side panel React 挂载入口
 *
 * 复用根 index.css（含 Tailwind + Material Symbols @font-face + 全局样式）。
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ExtensionApp } from './ExtensionApp';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ExtensionApp />
  </StrictMode>
);
