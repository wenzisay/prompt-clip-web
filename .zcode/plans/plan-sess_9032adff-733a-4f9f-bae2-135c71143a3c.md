## 方案：重构 SkillCard Agent 工具栏「更多」下拉的 UI 与交互

### 问题根因
当前 `SkillAgentToolBar.tsx` 有三个具体毛病：
1. **hover 即消失**：`onMouseEnter/Leave` + `mb-2` 在按钮与浮层间留了视觉间隙，鼠标移向浮层时路径偏出容器即触发 `onMouseLeave` 关闭。没有延迟容错，也没有桥接区域。
2. **总向上展开**：硬编码 `bottom-full right-0`（第 129 行），无视视口剩余空间，卡片在视口下半部时浮层被挤压/溢出。
3. **「更多」按钮不协调**：带边框灰底文字按钮（`border border-border bg-surface-dim min-w-[64px]`），与左侧 10×10 圆角图标磁贴（`h-10 w-10 rounded-lg bg-accent-soft`）风格完全脱节。

### 设计原则
复用代码库已有模式，不引入新依赖：
- **触发**：改 hover → **点击触发**，与 `SkillCard.tsx:104-151` 自身的 `more_vert` 菜单一致。点击外部、ESC、选择项目后自动关闭。鼠标移动不会误关，触屏/键盘友好。
- **定位**：改 `bottom-full` 硬编码 → **`createPortal` 到 `document.body` + `position:fixed` + 视口自适应**，仿 `ContextMenu.tsx`。默认向下；卡片锚点在视口下半部（剩余高度 < 浮层高度）时自动翻向上。
- **按钮形态**：改文字按钮 → **`+N` 图标磁贴**（N = 隐藏的工具数量），尺寸/圆角/背景完全复用左侧工具磁贴（`h-10 w-10 rounded-lg bg-accent-soft`），内容用文字徽标 `+N` 替代图标。视觉上与左侧工具成排。

### 改动文件

#### 1. `src/components/skill/SkillAgentToolBar.tsx`（核心重构）
- 删除 hover 触发逻辑（`onMouseEnter/onMouseLeave`）。
- 新增「点击触发」状态机：`isMenuOpen` 由按钮 `onClick` 切换；新增关闭副作用：
  - `mousedown` 监听点击外部关闭（用 `useRef` 持有触发按钮和 portal 根节点判断 contains，仿 `SkillCard.tsx:36-45`）。
  - `keydown` Escape 关闭。
  - `resize` 关闭（避免重新测量定位抖动）。
  - 已有的 `hiddenTools.length === 0 && isMenuOpen` 自动收起分支保留。
- 新增锚点测量：`useLayoutEffect` 在 `isMenuOpen` 为 true 时读取触发按钮 `getBoundingClientRect()`，计算浮层坐标。
  - 水平：右对齐锚点（`left = rect.right - menuWidth`），用 `Math.max/clamp` 防止溢出左视口。
  - 垂直：默认向下（`top = rect.bottom + gap`）；若 `rect.bottom + gap + menuHeight > window.innerHeight - margin` 则翻向上（`top = rect.top - gap - menuHeight`），同样 clamp 到 `margin`。`menuHeight` 用 `menuRef.getBoundingClientRect().height`（浮层渲染后测量）。
- 「更多」按钮改写为磁贴风格：
  ```tsx
  <button
    type="button"
    aria-label={moreLabel}
    aria-expanded={isMenuOpen}
    aria-haspopup="menu"
    ref={triggerRef}
    onClick={(event) => { event.stopPropagation(); toggle(); }}
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
      bg-accent-soft text-sm font-semibold text-accent transition-colors
      hover:bg-accent-soft-strong"
  >
    +{hiddenTools.length}
  </button>
  ```
  其中 `bg-accent-soft-strong` 如未在主题中定义，则用 `hover:bg-surface-dim` 替代，保持与现有 hover 风格一致。
- 浮层改用 `createPortal(... , document.body)` 渲染：
  ```tsx
  {isMenuOpen && coords && createPortal(
    <div ref={menuRef} role="menu" style={{ position: 'fixed', left: coords.left, top: coords.top }}
      className="z-[60] w-56 max-h-64 overflow-y-auto rounded-lg border border-border
      bg-surface py-1 shadow-card-hover"
      onClick={(e) => e.stopPropagation()}>
      {hiddenTools.map((tool) => <Fragment key={tool.id}>{renderTool(tool, 'menu')}</Fragment>)}
    </div>,
    document.body
  )}
  ```
  移除原 `onClickCapture={() => close()}`（交给 `renderTool('menu')` 自身的 `handleClick` 即可，菜单项点击后浮层会因后续 `hiddenTools` 可能变化或显式 `close()` 而关闭）—— 实际上保留点击后立即关闭更稳妥，会在浮层内 `onClickCapture` 中调 `close()`。
- 删除原来的相对定位 `relative shrink-0` 包裹 + `absolute bottom-full right-0 mb-2` 浮层。
- `onOpenChange` 回调保留（`SkillCard` 用它协调 `z-30` 提层）。
- `getVisibleToolCount` 函数：更新 `MORE_BUTTON_WIDTH` 常量从 `80` → `40`（磁贴化后与单个工具磁贴同宽），并补充注释。

#### 2. `src/components/skill/SkillCard.tsx`（小适配）
- 现有 `isToolMenuOpen` + `z-30` 协调逻辑（第 76 行）保留不变，行为一致（浮层打开时卡片提层避免被相邻卡片覆盖）。
- `renderTool('menu')` 回调保持原样 —— 它已经返回带图标、名称、状态、点击处理的菜单项，新浮层直接复用。

#### 3. `src/components/skill/SkillAgentToolBar.test.tsx`（测试更新）
- `getVisibleToolCount` 用例：更新 `MORE_BUTTON_WIDTH` 变化后的断言（80→40 会让更多工具可见）。例如 `getVisibleToolCount(360, 8)` 原期望 5，改为按新宽度重算（约 6-7，需实际计算后断言）。
- 新增用例：
  - 「点击 +N 按钮展开浮层」：`fireEvent.click` 触发，断言 `hiddenTools` 的菜单项在 `document.body` 中可见（用 `screen.getByRole('menu')`）。
  - 「点击外部关闭」：展开后 `document.dispatchEvent(new MouseEvent('mousedown'))`，断言浮层消失。
  - 「Escape 关闭」：展开后 `fireEvent.keyDown(document, { key: 'Escape' })`，断言浮层消失。
  - 「+N 文案」：断言按钮文本为 `+3`（当 `hiddenTools.length === 3`）。
- 既有「recalculates overflow」用例保留（ResizeObserver 重算逻辑不变）。

#### 4. `src/i18n/messages.ts`（无改动）
- `moreTools` 既有四语言文案继续作为 `aria-label` 使用，不改。

### 不需要做的
- 不新增 Material Symbols 图标（`+N` 是文字徽标，Agent 图标走 SVG）。无需运行字体子集化脚本。
- 不改 `getVisibleToolCount` 的算法结构，只调整 `MORE_BUTTON_WIDTH` 常量。
- 不动 `SkillFilterTabs` / `Sidebar`（本次问题与它们无关）。

### 验收
- `npm run type-check`
- `npm run lint`
- `npm run test -- --run src/components/skill/SkillAgentToolBar.test.tsx`
- 全量 `npm run test -- --run`（确保未破坏 SkillCard 相关测试）
- `npm run build`
- 手动/浏览器验证：卡片较窄时出现 `+N` 磁贴；点击展开浮层，鼠标在浮层内移动不消失；点击空白/ESC/选择项后关闭；卡片靠近视口底部时浮层自动向上展开；卡片靠近顶部时向下展开。