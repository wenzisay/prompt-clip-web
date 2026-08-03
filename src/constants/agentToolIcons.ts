// Agent 工具图标注册表
//
// 图标文件放在 `src/assets/agents/` 下，文件名（不含扩展名）即为工具 id
// （例如 `claude-code.svg`、`continue.png`）。支持 svg / png / jpg / jpeg，
// 同名时按 svg > png > jpg > jpeg 的优先级选取。
//
// 新增工具图标时，把文件丢进 `src/assets/agents/` 即可，无需改本文件。

const iconModules = import.meta.glob('../assets/agents/*.{svg,png,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const extensionPriority: Record<string, number> = {
  svg: 4,
  png: 3,
  jpg: 2,
  jpeg: 1,
};

// 构建 tool id -> icon url 映射，同名多扩展名时取优先级最高者
const AGENT_TOOL_ICONS_RAW: Record<string, string> = {};
const selectedPriority: Record<string, number> = {};

for (const modulePath of Object.keys(iconModules)) {
  // 提取文件名（去扩展名）：.../claude-code.svg -> claude-code
  const filename = modulePath.split('/').pop() ?? '';
  const id = filename.replace(/\.[^.]+$/, '');
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const priority = extensionPriority[ext] ?? 0;

  if (AGENT_TOOL_ICONS_RAW[id] && (selectedPriority[id] ?? 0) >= priority) {
    continue;
  }
  AGENT_TOOL_ICONS_RAW[id] = iconModules[modulePath];
  selectedPriority[id] = priority;
}

export const AGENT_TOOL_ICONS: Readonly<Record<string, string>> = AGENT_TOOL_ICONS_RAW;

export function getAgentToolIcon(iconId: string): string {
  // 缺失时回退到通用 agents-skills 图标
  return AGENT_TOOL_ICONS_RAW[iconId] || AGENT_TOOL_ICONS_RAW['agents-skills'] || '';
}
