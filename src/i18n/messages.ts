import type { PromptMetadataField } from '@/services/metadataRepairService';
import type { Locale } from './types';

export const DEFAULT_LOCALE: Locale = 'en-US';

export const LOCALE_OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: 'zh-CN', label: '中文（简体）' },
  { value: 'zh-TW', label: '中文（繁體）' },
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' },
];

export const messages = {
  'zh-CN': {
    common: {
      cancel: '取消',
    },
    app: {
      prompts: 'Prompts',
      skills: 'Skills',
      noWorkspace: '未选择目录',
      tags: '标签',
      pinnedTags: '置顶标签',
      allTags: '全部标签',
      noTags: '暂无标签',
      localStorage: '数据存储在本地',
      expandStorage: '展开数据文件夹信息',
      collapseStorage: '收起数据文件夹信息',
      openSettings: '打开设置',
      collapseSidebar: '折叠侧边栏',
      expandSidebar: '展开侧边栏',
      switchFolder: '切换文件夹',
      searchPlaceholder: '快速搜索',
      quickSwitch: '快速切换',
      quickSwitchAria: (shortcut: string) => `快速切换 ${shortcut}`,
      clearSearch: '清空搜索',
      searchResultCount: (count: number) => `找到 ${count} 个结果`,
      exportPrompts: '导出 Prompts',
      createPrompt: '新建 Prompt (Cmd+N)',
      all: '全部',
      recent: '最近修改',
      favorites: '收藏',
      select: '选择',
      deselect: '取消选择',
      favorite: '收藏',
      unfavorite: '取消收藏',
      moreActions: '更多操作',
      edit: '编辑',
      delete: '删除',
      sharePrompt: '分享',
      copyPromptContent: '复制 Prompt 内容',
      copy: '复制',
      copied: '已复制',
      tagActions: '标签操作',
      pin: '置顶',
      unpin: '取消置顶',
      rename: '重命名',
      deleteTag: '删除标签',
      renameTagPrompt: '输入新的标签路径',
      removeTagConfirm: (tag: string) => `确定要从相关 Prompt 中移除标签 #${tag} 吗？`,
      detailPanel: '详情面板',
      noPromptSelected: '未选择 Prompt',
      close: '关闭',
      resizeDrawer: '调整抽屉宽度',
      dragResize: '拖动调整宽度',
      characterCount: (count: number) => `${count} 字符`,
      usageCount: (count: number) => `使用 ${count} 次`,
      favorited: '已收藏',
      notFavorited: '未收藏',
      noAnnotationSummary: '无批注',
      annotationSummary: (count: number) => `${count} 条批注`,
      viewHistory: '查看历史版本',
      historyVersions: '历史版本',
      content: '内容',
      sourceMode: '源码模式',
      liveMode: 'Live Preview',
      previewMode: '渲染模式',
      toggleMarkdownMode: '切换 Markdown 显示模式',
      editPrompt: '编辑 Prompt',
      doubleClickToEdit: '双击进入编辑',
      createPromptTitle: '新建 Prompt',
      title: '标题',
      titlePlaceholder: '输入 Prompt 标题...',
      add: '添加',
      tagNamePlaceholder: '标签名称',
      removeTag: '移除标签',
      removeTagAria: (tag: string) => `移除标签 ${tag}`,
      contentPlaceholder: '输入 Prompt 内容...',
      promptContent: 'Prompt 内容',
      enterTitle: '请输入标题',
      enterContent: '请输入内容',
      saving: '保存中...',
      save: '保存',
      create: '创建',
      fullscreenEdit: '全屏编辑',
      exitFullscreen: '退出全屏',
      loading: '加载中...',
      noContent: '暂无内容',
      renderFailed: '渲染失败',
      loadPromptsFailed: '加载 Prompts 失败',
      permissionDenied: '未授予目录访问权限',
      openDirectoryFailed: '打开目录失败',
      workspacePermissionExpired: '目录访问权限已过期，请重新选择数据目录',
      noPromptsFound: '没有找到 Prompts',
      emptyPromptHint: '尝试调整搜索条件或创建一个新的 Prompt',
      batchDeleteConfirm: (count: number) =>
        `确定要将 ${count} 个 Prompt 移动到 .trash 吗？`,
      selectedCount: (count: number) => `已选择 ${count} 个`,
      toggleSelectAll: '全选/取消全选',
      clear: '清除',
      confirmDelete: '确认删除',
      deletePromptConfirm: (title: string) => `确定要删除 Prompt ${title} 吗？`,
      deletePromptNote: '此操作会将文件移动到 .trash 目录，并从当前列表中移除。',
      historyLoadFailed: '读取历史版本失败',
      historyCopyFailed: '复制历史版本失败',
      historyRestoreFailed: '恢复历史版本失败',
      restore: '恢复',
      restoring: '恢复中...',
      selectHistoryVersion: '请选择历史版本',
      noHistoryVersions: '暂无历史版本',
      exportTitle: '导出 Prompts',
      noExportablePrompts: '没有可导出的 Prompt',
      exportFailed: '导出失败',
      exportScope: '导出范围',
      selectedScope: (count: number) => `选中 ${count}`,
      filteredScope: (count: number) => `当前筛选 ${count}`,
      allScope: (count: number) => `全部 ${count}`,
      exportFormat: '导出格式',
      exportCount: (count: number) => `将导出 ${count} 个 Prompt`,
      exporting: '导出中...',
      export: '导出',
      shareImageTitle: '生成分享图片',
      shareTemplate: '卡片模板',
      shareOptions: '分享选项',
      showAuthorInfo: '显示作者信息',
      showPromptClipLogo: '显示 PromptClip 标志',
      showPromptTags: '显示笔记中的标签',
      renderMarkdown: '渲染 Markdown',
      shareRightClickHint: '可右键点击预览图片保存或复制',
      downloadImage: '下载图片',
      copyImage: '复制图片',
      generatingImage: '生成中...',
      shareImageDownloaded: '图片已下载',
      shareImageCopied: '图片已复制',
      shareImageGenerateFailed: '生成分享图片失败',
      shareImageCopyFailed: '复制图片失败',
      sharePreviewMissing: '未找到分享图片预览区域',
      shareContentTruncated: '内容已截断至 2000 字符。',
      shareIncludeAnnotations: '包含批注',
      shareNoAnnotations: '该 Prompt 暂无批注',
      annotations: '批注',
      noAnnotations: '暂无批注',
      annotationText: '批注内容',
      annotationPlaceholder: '记录这条 Prompt 的使用效果...',
      saveAnnotation: '保存批注',
      savingAnnotation: '保存中...',
      addImage: '添加图片',
      removeImage: '移除图片',
      editAnnotation: '编辑批注',
      deleteAnnotation: '删除批注',
      annotationDeleteConfirm: '确定要删除这条批注吗？',
      annotationLoadFailed: '读取批注失败',
      annotationSaveFailed: '保存批注失败',
      annotationImageTooLarge: '图片不能超过 5MB',
      annotationImageOnly: '仅支持图片附件',
      annotationImageSelected: (name: string) => `已选择 ${name}`,
      annotationCreatedAt: (time: string) => `创建于 ${time}`,
      annotationUpdatedAt: (time: string) => `编辑于 ${time}`,
      annotationImageAlt: (name: string) => `批注图片 ${name}`,
      openAnnotationImage: '放大查看图片',
      closeAnnotationImage: '关闭图片预览',
      expandAnnotation: '展开',
      collapseAnnotation: '收起',
      commandNewPrompt: '新建 Prompt',
      commandSearchPrompts: '搜索 Prompts',
      commandInputPlaceholder: '输入命令或搜索...',
      commandNoMatches: '未找到匹配的命令',
      commandActionGroup: '操作',
      commandTitleGroup: '标题',
      commandRecentGroup: '最近使用',
      commandSearchGroup: '搜索',
      fullTextSearch: (query: string) => `全文搜索「${query}」`,
      navigate: '导航',
      selectCommand: '选择',
      closeCommand: '关闭',
      welcomeBadgeOne: '高效管理',
      welcomeBadgeTwo: '智能组织',
      welcomeBadgeThree: '随时调用',
      welcomeSubtitle: '你的个人 Prompt 管理工具',
      welcomeDescription: '集中管理你的灵感与提示词，结构化组织、快速检索。',
      unsupportedBrowserTitle: '当前浏览器不支持',
      unsupportedBrowserDescription: '读写本地文件。请使用 Chrome 或 Edge 86+ 访问。',
      chooseDataDirectory: '选择数据目录',
      localOnlyNote: '所有数据仅存储在本地，不会上传到任何服务器',
      downloadClientDivider: '或下载客户端',
      downloadIOS: 'iOS App',
      downloadDesktop: '桌面版',
      featureLocalTitle: 'Local First',
      featureLocalDescription: ['数据存储在本地，隐私安全，数据只属于你。'],
      featureFastTitle: 'File over app',
      featureFastDescription: ['采用完全开放的 Markdown 文件存储数据，自由迁移。'],
      featureMarkdownTitle: '多端APP',
      featureMarkdownDescription: ['Web App、iOS（iPhone/iOS）、Windows、Mac。'],
    },
    settings: {
      title: '设置',
      generalTab: '通用',
      backupTab: '备份',
      backupTitle: '备份',
      backupDescription: '将完整工作区增量备份到专用的 WebDAV 目录。',
      backupDesktopOnly: '备份功能仅在桌面版中可用。',
      backupName: '目标名称',
      backupUrl: 'WebDAV 地址（HTTPS）',
      backupUsername: '用户名',
      backupPassword: '密码',
      backupPasswordPlaceholder: '留空以使用系统钥匙串中的密码',
      backupRemotePath: '远端专用目录',
      backupTestConnection: '测试连接',
      backupTesting: '正在测试连接…',
      backupInProgress: '正在备份，请勿关闭应用…',
      restoreInProgress: '正在恢复，请勿关闭应用…',
      backupConnectionSucceeded: '连接成功',
      backupRemoteDirectoryNotFound: '请确保路径正确且远端专用目录已创建。',
      backupNow: '立即备份',
      backupRestore: '整库恢复',
      backupNoWorkspace: '请先选择本地工作区',
      backupCancelled: '已取消',
      restoreConfigConflictTitle: '恢复工作区配置',
      restoreConfigConflict: '所选目录已存在 promptclip.config.json，是否使用备份中的配置覆盖？',
      restoreConfigOverwrite: '覆盖',
      restoreConfigSkip: '跳过',
      backupSucceeded: (uploaded: number, deleted: number) =>
        `备份完成：上传 ${uploaded} 个，删除 ${deleted} 个`,
      restoreSucceeded: (restored: number, unchanged: number, skipped: number) =>
        `恢复完成：写入 ${restored} 个，跳过 ${unchanged} 个未变化文件，保留 ${skipped} 个文件`,
      aboutTab: '关于',
      reset: '恢复默认设置',
      save: '保存设置',
      saving: '保存中...',
      saved: '设置已保存',
      saveFailed: '保存设置失败',
      generalTitle: '通用设置',
      generalDescription: '管理 PromptClip 的通用行为和偏好设置',
      languageTitle: '语言',
      languageDescription: '切换 PromptClip 的界面显示语言。',
      shareAuthorTitle: '分享作者',
      shareAuthorDescription: '用于分享图片左上角的作者名称。留空时不会显示作者信息。',
      shareAuthorPlaceholder: '输入作者名称',
      chinese: '中文',
      english: '英文',
      historyTitle: '历史版本',
      fileWatchingTitle: '自动监听文件变动',
      fileWatchingDescription:
        '开启后，工作区中的 Markdown 文件被外部新增、修改或删除时，PromptClip 会自动更新界面。',
      fileWatchingAriaLabel: '自动监听文件变动',
      fileWatchingNote:
        'Web 端通过定时检查实现，可能存在短暂延迟；关闭后将在重新打开工作区时读取外部变化。',
      analyticsTitle: '使用统计',
      analyticsDescription:
        '帮助了解功能使用情况。仅匿名上报页面访问与功能使用计数，不收集 Prompt 内容。仅 Web 端生效。',
      analyticsAriaLabel: '使用统计',
      analyticsNote:
        '基于 Google Analytics 4，IP 地址匿名化处理。关闭后不再新增上报，已发事件无法撤回。',
      historyDescription: '默认关闭。启用后，后续版本会在编辑笔记时保留历史快照。',
      historyAriaLabel: '启用历史版本',
      historyNote: '关闭后不会自动创建历史目录和历史快照；保留天数目前仅保存配置，暂不自动清理。',
      retentionDays: '保留天数',
      days: (days: number) => `${days} 天`,
      maintenanceTitle: '文件夹维护',
      metadataPromptTitle: '发现元数据问题',
      metadataPromptDescription: (count: number) =>
        `发现 ${count} 个 Markdown 文件缺少或包含无效的 PromptClip 元数据。`,
      metadataPromptIgnore: '本次忽略',
      metadataPromptView: '查看详情',
      metadataPromptRepair: '自动修复',
      maintenanceDescription:
        '扫描 Obsidian 创建的 Markdown，补全 PromptClip 需要的 frontmatter。',
      scanMetadata: '扫描元数据',
      scanningMetadata: '扫描中...',
      scanFailed: '扫描元数据失败',
      scanEmpty: '扫描后会列出缺少或无效的 PromptClip 元数据，不会立即修改文件。',
      scanHealthy: (count: number) => `共扫描 ${count} 个 Markdown 文件，当前无需补全。`,
      scanRepairable: (total: number, repairable: number) =>
        `共扫描 ${total} 个 Markdown 文件，${repairable} 个文件需要补全。`,
      missingFields: '缺失',
      invalidFields: '无效',
      hiddenIssues: (count: number, limit: number) =>
        `还有 ${count} 个文件未显示，列表最多显示前 ${limit} 个。`,
      repairMetadata: '补全缺失元数据',
      repairingMetadata: '补全中...',
      repairConfirm: (count: number) =>
        `将补全 ${count} 个文件的缺失元数据。已有字段和正文会保留，是否继续？`,
      repairSucceeded: (count: number) => `已补全 ${count} 个文件`,
      repairFailed: '补全元数据失败',
      emptyField: '无',
      aboutTitle: 'PromptClip',
      aboutDescription: '为 AI 时代而构建的个人 Prompt 工作空间',
      aboutIntroParagraphs: [
        'AI 对话随时会消失在信息流里。但真正重要的 Prompt、思考与工作流，本就不该随之消散。',
        'PromptClip 让这些内容在你的文件系统中持续生长：快速记录，便捷检索，持续复用，长期演化。',
      ],
      aboutFileTitle: 'File over app / 文件，高于应用',
      aboutFileParagraphs: [
        'PromptClip 将内容存储为完全开放的 Markdown 文件。',
        '你可以用任意编辑器打开、修改它们，也可以像普通文件一样进行备份、同步、迁移与版本管理。',
        '它能够与 Obsidian 等 Markdown 笔记工具自然协同，不将你的数据锁在任何封闭平台里。',
      ],
      aboutLocalTitle: 'Local First / 本地优先',
      aboutLocalParagraphs: [
        '所有文件直接留在你自己的设备上。',
        '无需云端数据库，无需账号系统，不绑定任何在线平台。',
        '你的数据，百分之百属于你。',
      ],
      aboutCommitment:
        '以上是一种自我保障的承诺，工具可能会消失，数据永远属于你。',
      quickSearch: {
        title: '快速搜索',
        description:
          '在任意应用中用全局快捷键呼出搜索浮窗，搜索后可粘贴到光标处或在主窗口打开详情。',
        enabledLabel: '启用全局搜索框',
        enabledDescription: '关闭后不会注册全局快捷键，也不会从其它应用唤出搜索浮窗。',
        shortcutLabel: '呼出快捷键',
        shortcutRecord: '点击录入',
        shortcutRecording: '请按下组合键…',
        shortcutReset: '恢复默认',
        shortcutUpdateFailed: '快捷键无效或被占用，请重试',
        macPermissionLabel: 'macOS 无障碍权限',
        macPermissionGranted: '已授权',
        macPermissionOpen: '打开系统设置',
        macPermissionHint: '自动粘贴需要无障碍权限；授权后返回 PromptClip，状态会自动刷新。',
        placeholder: '搜索 Prompt…',
        noResults: '无匹配结果',
        resultsLabel: '搜索结果',
        paste: '粘贴',
        openDetail: '在主应用中打开详情',
      },
    },
    skills: {
      title: 'Skills',
      hubSkillCount: (count: number) => `已管理 ${count} 个 Skills`,
      managePrompts: '管理 Prompts',
      manageSkills: '管理 Skills',
      searchPlaceholder: '按名称搜索 Skills',
      all: '全部',
      favorites: '收藏',
      clearFilter: '清除筛选',
      agents: 'Agents',
      noAgents: '未检测到已安装的 Agent',
      moreTools: '更多',
      refresh: '扫描 Skills',
      refreshHint: '扫描本机 Agents 已有 Skills 并导入',
      create: '新建 Skill',
      upload: '上传 Skill',
      settings: '同步设置',
      loading: '正在加载 Skills…',
      noSkills: '还没有 Skills',
      noSkillsHint: '扫描、新建或上传 Skills，开始统一管理 Agent Skills。',
      noMatchingSkills: '没有匹配的 Skills',
      noMatchingSkillsHint: '尝试调整搜索关键词或切换其他筛选条件。',
      favorite: '收藏 Skill',
      unfavorite: '取消收藏 Skill',
      enableFor: (tool: string) => `为 ${tool} 启用`,
      disableFor: (tool: string) => `为 ${tool} 停用`,
      resyncFor: (tool: string) => `重新同步到 ${tool}`,
      repairBrokenFor: (tool: string) => `修复 ${tool} 中损坏的链接`,
      repairBroken: '修复链接',
      confirmRepairBroken: (skill: string, tool: string, path: string) =>
        `确认修复 ${tool} 中损坏的 Skill“${skill}”链接吗？\n\n目标：${path}\n\nPromptClip 将移除已失效的链接并重新建立同步目标。`,
      forceOverwriteFor: (tool: string) => `强制覆盖 ${tool} 中的 Skill`,
      forceOverwrite: '强制覆盖',
      confirmForceOverwrite: (skill: string, tool: string, path: string) =>
        `确认强制覆盖 ${tool} 中的 Skill“${skill}”吗？\n\n目标：${path}\n\n现有的同名文件、目录或链接将被 PromptClip 替换，操作成功后无法撤销。`,
      fromAgentsSkills: '来自 Agents Skills',
      alsoInAgentsSkills: '也在 Agents Skills 中启用',
      fromAgentsSkillsTooltip: (tool: string) =>
        `该 Skill 通过通用 Agents Skills（~/.agents/skills）对 ${tool} 生效`,
      alsoInAgentsSkillsTooltip: (tool: string) =>
        `该 Skill 同时存在于 ${tool} 专属目录与通用 Agents Skills（~/.agents/skills）中`,
      duplicateSharedEnableTitle: (tool: string) => `确认重复为 ${tool} 启用`,
      enableAnyway: '仍然启用',
      confirmDuplicateSharedEnable: (skill: string, tool: string) =>
        `Skill“${skill}”已通过 Agents Skills（~/.agents/skills）对 ${tool} 生效。\n\n继续启用会在 ${tool} 的专属目录中再同步一份，避免重复加载建议直接复用 Agents Skills。仍要继续吗？`,
      agentCountTooltipWithShared: (tool: string, total: number, shared: number) =>
        `${tool}（共 ${total} 个，其中 ${shared} 个来自 Agents Skills）`,
      pendingFor: (tool: string) => `${tool} 正在同步`,
      statusEnabled: '已启用',
      statusDisabled: '未启用',
      statusStale: '需要同步',
      statusBroken: '链接损坏',
      statusConflict: '存在冲突',
      quickSwitch: '快速切换',
      scanExternal: '检查 Agent 中的新 Skills',
      export: '导出 ZIP',
      importTitle: '导入 Agent Skills',
      importSummary: (total: number, existing: number, added: number) =>
        `扫描到 ${total} 个 Skills，其中 ${existing} 个已存在、${added} 个新增`,
      existingSkills: '已存在',
      newSkills: '新增',
      keepHub: '保留 PromptClip 版本',
      useExternal: '使用这个外部版本',
      skipImport: '跳过',
      confirmImport: '确认导入',
      importing: '正在导入…',
      importingProgress: (current: number, total: number) => `正在导入 (${current}/${total})…`,
      importingProgressDetail: (skill: string, current: number, total: number) =>
        `正在导入 ${skill}（第 ${current}/${total} 个）`,
      close: '关闭',
      sourceCount: (count: number) => `${count} 个来源`,
      invalidExternalEntries: (count: number) => `${count} 个外部 Skill 无法扫描`,
      invalidBrokenLinkCountBadge: (count: number) => `含 ${count} 个可清理的失效链接`,
      invalidGroupTitle: (code: string) => {
        switch (code) {
          case 'skill_external_link_invalid':
            return '失效符号链接';
          case 'skill_markdown_invalid_type':
            return '入口文件为符号链接';
          case 'skill_content_symlink':
            return '内部包含符号链接';
          case 'invalid_skill_id':
            return '目录名不符合规范';
          case 'skill_name_mismatch':
            return '名称与目录名不一致';
          case 'skill_markdown_missing':
            return '缺少 SKILL.md 入口文件';
          default:
            return '其他无法扫描项';
        }
      },
      invalidGroupHint: (code: string) => {
        switch (code) {
          case 'skill_external_link_invalid':
            return '这些软链接指向的目标已不存在或不是文件夹，可直接安全清理。';
          case 'skill_markdown_invalid_type':
            return '入口文件 SKILL.md 为符号链接（常见于外部插件套件生成的子 Skill），建议保持由原工具管理，暂不导入。';
          case 'skill_content_symlink':
            return '目录内包含符号链接（常见于自带 node_modules 等依赖的插件仓库），为避免破坏运行环境暂不导入，建议保持由原工具管理。';
          default:
            return null;
        }
      },
      cleanupBrokenLink: '清理链接',
      cleanupAllBrokenLinks: '一键清理全部',
      cleaningBrokenLinks: '正在清理…',
      confirmCleanupBrokenLinkTitle: '清理失效符号链接',
      confirmCleanupBrokenLink: (name: string, path: string) =>
        `确认清理失效符号链接“${name}”吗？\n\n路径：${path}\n\n仅移除已断开的符号链接本身，不会删除任何正常文件夹。`,
      confirmCleanupAllBrokenLinks: (count: number) =>
        `确认清理全部 ${count} 个失效符号链接吗？\n\n仅移除已断开的符号链接本身，不会删除任何正常文件夹。`,
      cleanupBrokenLinksSuccess: (count: number) => `已清理 ${count} 个失效符号链接`,
      skillScanError: (code: string, params: Record<string, string>) => {
        switch (code) {
          case 'invalid_skill_id':
            return `目录名「${params.skillId ?? ''}」不是合法的 Skill 名称（仅允许字母、数字、-、_、.、@、:，不能以 . 开头或结尾，最长 128 个字符）。`;
          case 'skill_name_mismatch':
            return `元数据 name「${params.metadataName ?? ''}」与目录名「${params.directoryName ?? ''}」不一致。`;
          case 'skill_markdown_missing':
            return '缺少 Skill 入口文件（SKILL.md）。';
          case 'skill_markdown_invalid_type':
            return 'Skill 入口文件必须是普通文件，不能是链接。';
          case 'skill_source_invalid':
            return '该 Skill 目录既不是文件夹，也不是有效的链接。';
          case 'skill_external_link_invalid':
            return '符号链接已断开或未指向文件夹。';
          case 'skill_frontmatter_missing':
            return 'Skill 文件缺少 YAML frontmatter（必须以「---」开头）。';
          case 'skill_frontmatter_unclosed':
            return 'YAML frontmatter 未闭合（缺少结尾的「---」）。';
          case 'skill_frontmatter_invalid':
            return 'YAML frontmatter 解析失败（必须包含 name 和 description）。';
          case 'skill_description_empty':
            return 'Skill 描述为空。';
          case 'skill_content_symlink':
            return `Skill 内部包含符号链接（「${params.path ?? ''}」），通常为自带依赖的插件仓库，建议保持原工具管理。`;
          case 'skill_content_special_file':
            return `Skill 内部包含不支持的特殊文件（「${params.path ?? ''}」）。`;
          case 'skill_io_error':
            return `执行 ${params.operation ?? ''} 时发生文件系统错误：${params.message ?? ''}`;
          case 'skill_path_outside_root':
            return 'Skill 目录结构无效。';
          default:
            return '该 Skill 无法扫描，请检查其目录结构。';
        }
      },
      revealExternalPath: (path: string) => `在文件管理器中显示 ${path}`,
      createTitle: '新建 Skill',
      skillName: 'Skill 名称',
      skillNameHint: '仅支持小写字母、数字和单个连字符，最长 64 个字符。',
      skillDescription: 'Skill 描述',
      cancel: '取消',
      confirmCreate: '创建并打开',
      archiveTitle: '上传 Skill 归档',
      archiveConflict: 'PromptClip 中已有同名 Skill，请选择保留的版本。',
      confirmArchiveImport: '确认导入',
      backToSkills: '返回 Skills',
      revealSkillFolder: '在文件管理器中打开 Skill 目录',
      newFolder: '新建文件夹',
      newFile: '新建文本文件',
      uploadFile: '上传文件',
      rename: '重命名',
      delete: '删除',
      deleteSkill: '删除 Skill',
      deleteSkillTitle: '删除 Skill',
      deleteSkillConfirm: (skill: string) => `确定删除“${skill}”吗？`,
      deleteSkillNote: '此操作将从 PromptClip 中永久删除此 Skill，且无法撤销。',
      deleteManagedSkillNote:
        '此 Skill 正在 Agent 工具中使用。你可以同时删除所有受管副本，或保留 Agent 中的 Skill；软链接将转换为独立副本。',
      deleteEverywhere: '全部删除',
      deletePromptClipOnly: '仅从 PromptClip 删除',
      download: '下载',
      save: '保存',
      edit: '编辑',
      preview: '预览',
      binaryNoPreview: '此文件无法在应用内预览，可下载后使用其他应用打开。',
      selectFile: '从左侧选择一个文件',
      unsavedChanges: '有未保存的修改，确定放弃吗？',
      syncPartialFailure: '文件已保存，但部分复制目标同步失败。',
      operationFailed: '操作失败，请重试。',
      scanNoExternalFound: '扫描完成，未发现需要导入的外部 Skill。',
      skillOperationError: (code: string, params: Record<string, string>) => {
        switch (code) {
          case 'skill_already_exists':
            return '已存在同名 Skill，请更换名称。';
          case 'skill_symlink_permission_denied':
            return '创建软链接权限不足：在 Windows 上请开启“开发者模式”，或在同步设置中改用“文件复制”。';
          case 'skill_file_conflict':
            return '文件已被外部程序修改，保存已取消以避免覆盖；请重新加载后再编辑。';
          case 'skill_file_too_large':
            return '文件超过大小限制，无法读取或上传。';
          case 'skill_file_not_text':
            return '该文件类型不支持在应用内作为文本编辑。';
          case 'skill_file_not_utf8':
            return '该文件不是有效的 UTF-8 文本，无法在应用内编辑。';
          case 'skill_entry_exists':
            return '目标位置已存在同名文件或文件夹。';
          case 'skill_entry_protected':
            return '核心入口文件 SKILL.md 受保护，不能重命名或删除。';
          case 'skill_archive_multiple_roots':
            return '压缩包内包含多个顶层目录，每次仅支持导入单个 Skill。';
          case 'skill_archive_too_large':
            return '压缩包超过 50 MiB 上限，无法导入。';
          case 'skill_archive_expanded_too_large':
            return '压缩包解压后超过 200 MiB 上限，无法导入。';
          case 'skill_archive_too_many_entries':
            return '压缩包内文件数量超过 5,000 个上限，无法导入。';
          case 'skill_archive_unsafe_path':
          case 'skill_archive_special_entry':
            return '压缩包包含不安全的路径或特殊链接条目，已拒绝导入。';
          case 'skill_archive_extension_invalid':
            return '仅支持导入 .zip 或 .skill 格式的压缩包。';
          case 'skill_archive_invalid':
            return '压缩包无效或已损坏，无法解析。';
          case 'skill_target_conflict':
            return '目标工具目录中存在非 PromptClip 管理的同名内容，请点击工具图标确认后再处理。';
          case 'skill_target_group_mode_conflict':
            return '共享同一目录的多个工具配置了不同的同步方式，请先在设置中统一。';
          case 'skill_custom_tool_name_required':
            return '请输入自定义工具名称。';
          case 'skill_custom_tool_path_required':
            return '请输入自定义工具的 Skills 目录路径。';
          case 'skill_custom_tool_path_not_absolute':
          case 'skill_custom_tool_path_invalid':
            return '自定义工具的 Skills 目录必须是合法的绝对路径。';
          case 'skill_custom_tool_duplicate':
            return '已存在同名或同路径的自定义工具。';
          case 'skill_category_name_required':
            return '分类名称不能为空。';
          case 'skill_category_name_too_long':
            return '分类名称过长。';
          case 'skill_category_name_duplicate':
            return '分类名称已存在。';
          case 'skill_category_name_reserved':
            return '该名称为保留名称，请换一个。';
          case 'skill_source_changed':
            return '外部 Skill 内容已发生变化，请重新扫描后再导入。';
          case 'skill_io_error':
            return params.message
              ? `文件读写失败：${params.message}`
              : '文件读写失败，请检查目录权限后重试。';
          default:
            return params.message
              ? `操作失败：${params.message}`
              : '操作失败，请重试。';
        }
      },
      invalidSkillName: 'Skill 名称格式不正确。',
      exportSuccess: 'Skill 已导出。',
      protected: '受保护',
      defaultSyncMode: '默认同步方式',
      inheritMode: '跟随全局默认',
      symlinkMode: '软链接',
      copyMode: '文件复制',
      settingsTitle: '设置',
      syncTab: '同步设置',
      syncDescription: '配置 Skills 写入 Agent 工具的方式。',
      storageTab: '数据存储',
      storageDescription: 'PromptClip 将所有 Skill 保存在本地文件夹中。',
      storagePath: '存储位置',
      storageOpen: '在文件管理器中打开',
      storageDesktopOnly: '数据存储仅在桌面版中可用。',
      storageOpenFailed: '打开失败，请重试。',
      saveSettings: '保存设置',
      migrationHint: '保存后，已启用的 Skills 将迁移到新的同步方式；失败项可再次重试。',
      agentNotInstalled: '未安装',
      uninstalledAgents: (count: number) => `未检测到安装的 Agent（${count}）`,
      enableAgent: (tool: string) => `启用 ${tool}`,
      disableAgent: (tool: string) => `停用 ${tool}`,
      agentDisabledHint: '已停用的 Agent 不会出现在 Skill 卡片和导航栏，也不会参与同步。',
      customTools: '自定义工具',
      customToolHint: '添加尚未内置支持的 Agent 工具：填写名称与该工具读取 Skills 的目录路径。',
      customToolName: '工具名称',
      customToolNamePlaceholder: '例如 MyAgent',
      customToolPath: 'Skills 目录路径',
      customToolPathPlaceholder: '该 Agent 读取 Skills 的目录绝对路径',
      customToolSelectPath: '选择目录',
      customToolAdd: '添加',
      customToolRemove: '删除自定义工具',
      dragHandle: '拖拽以重新排序',
      dragHint: '拖拽手柄可调整 Agent 顺序，主界面卡片与导航栏将同步更新。',
      // Skill 编辑页：文件操作对话框 / 右键菜单
      newFolderTitle: '新建文件夹',
      newFileTitle: '新建文件',
      renameTitle: '重命名',
      folderName: '文件夹名称',
      fileName: '文件名称',
      namePlaceholder: '请输入名称',
      confirm: '确定',
      deleteEntryConfirm: (name: string) => `确定删除“${name}”吗？`,
      deleteEntryNote: '此操作不可撤销。',
      dropHint: '拖拽文件到此处导入',
      dropFolderUnsupported: '暂不支持拖入文件夹，请选择文件。',
      dropConflictSkipped: (count: number) => `${count} 个文件因同名已存在被跳过。`,
      dropMoveIntoSelf: '不能移动到自身或其子目录中。',
      dropConflictMove: (name: string) => `「${name}」同名已存在，移动失败。`,
      categories: '分类',
      defaultCategory: '默认类别',
      addCategory: '新建分类',
      categoryName: '分类名称',
      categoryNamePlaceholder: '输入分类名称',
      renameCategory: '重命名分类',
      deleteCategory: '删除分类',
      deleteCategoryConfirm: (name: string) => `确定删除分类「${name}」吗？`,
      deleteCategoryNote: '该分类下的 Skill 会自动回到「默认类别」，不会被删除。',
      addToCategory: '添加到分类',
      newCategory: '新建分类',
      selectAll: '全选',
      deselectAll: '全不选',
      noSkillsInCategory: '该分类下暂无 Skill',
      noCategoriesYet: '暂无自建分类，在下方输入名称即可快速新建',
      quickCreateCategoryPlaceholder: '输入新分类名',
      categoryNameRequired: '分类名称不能为空',
      categoryNameTooLong: '分类名称过长',
      categoryNameDuplicate: '分类名称已存在',
      categoryNameReserved: '该名称为保留名称，请换一个',
    },
    metadataFields: {
      id: 'ID',
      title: '标题',
      tags: '标签',
      created: '创建时间',
      modified: '修改时间',
      copy_count: '复制次数',
      pinned: '收藏状态',
    } satisfies Record<PromptMetadataField, string>,
    recycle: {
      title: '回收站',
      commandOpen: '打开回收站',
      empty: '回收站为空',
      emptyAll: '全部清空',
      view: '查看',
      restore: '恢复',
      permanentDelete: '永久删除',
      closeDetail: '关闭详情',
      hasAnnotationsBadge: '含批注',
      loading: '加载中...',
      permanentlyDeleted: '已永久删除',
      allCleared: '回收站已清空',
      restoreSuffix: (counter: number) => `-恢复${counter}`,
      deletedAt: (date: string) => `删除于 ${date}`,
      confirmRestore: (title: string) => `确定恢复 "${title}" 吗？`,
      confirmPermanentDelete: (title: string) =>
        `确定永久删除 "${title}" 吗？此操作不可撤销。`,
      confirmEmptyAll: '确定清空回收站吗？所有文件将被永久删除。',
      restored: (title: string) => `已恢复 "${title}"`,
      restoreFailed: '恢复失败，请重试',
      deleteFailed: '删除失败，请重试',
      emptyFailed: '部分操作失败，请重试',
    },
    markdownEditor: {
      slashMenuLabel: '斜杠插入命令',
      slashMenuClose: '关闭斜杠菜单',
      toolbarLabel: 'Markdown 格式工具栏',
      toolbar: {
        h1: '一级标题',
        h2: '二级标题',
        h3: '三级标题',
        bold: '加粗',
        italic: '斜体',
        inlineCode: '行内代码',
        link: '链接',
        ul: '无序列表',
        ol: '有序列表',
        quote: '引用',
        codeBlock: '代码块',
        task: '任务列表',
      },
      slash: {
        h1: '一级标题',
        h2: '二级标题',
        h3: '三级标题',
        bold: '加粗',
        italic: '斜体',
        inlineCode: '行内代码',
        link: '链接',
        ul: '无序列表',
        ol: '有序列表',
        quote: '引用',
        codeBlock: '代码块',
        task: '任务列表',
        noMatch: '无匹配命令',
      },
    },
  },
  'zh-TW': {
    common: {
      cancel: '取消',
    },
    app: {
      prompts: 'Prompts',
      skills: 'Skills',
      noWorkspace: '未選擇目錄',
      tags: '標籤',
      pinnedTags: '置頂標籤',
      allTags: '全部標籤',
      noTags: '暫無標籤',
      localStorage: '資料儲存在本地',
      expandStorage: '展開資料夾資訊',
      collapseStorage: '收起資料夾資訊',
      openSettings: '開啟設定',
      collapseSidebar: '收起側邊欄',
      expandSidebar: '展開側邊欄',
      switchFolder: '切換資料夾',
      searchPlaceholder: '快速搜尋',
      quickSwitch: '快速切換',
      quickSwitchAria: (shortcut: string) => `快速切換 ${shortcut}`,
      clearSearch: '清空搜尋',
      searchResultCount: (count: number) => `找到 ${count} 個結果`,
      exportPrompts: '匯出 Prompts',
      createPrompt: '新建 Prompt (Cmd+N)',
      all: '全部',
      recent: '最近修改',
      favorites: '收藏',
      select: '選擇',
      deselect: '取消選擇',
      favorite: '收藏',
      unfavorite: '取消收藏',
      moreActions: '更多操作',
      edit: '編輯',
      delete: '刪除',
      sharePrompt: '分享',
      copyPromptContent: '複製 Prompt 內容',
      copy: '複製',
      copied: '已複製',
      tagActions: '標籤操作',
      pin: '置頂',
      unpin: '取消置頂',
      rename: '重新命名',
      deleteTag: '刪除標籤',
      renameTagPrompt: '輸入新的標籤路徑',
      removeTagConfirm: (tag: string) => `確定要從相關 Prompt 中移除標籤 #${tag} 嗎？`,
      detailPanel: '詳情面板',
      noPromptSelected: '未選擇 Prompt',
      close: '關閉',
      resizeDrawer: '調整抽屜寬度',
      dragResize: '拖曳調整寬度',
      characterCount: (count: number) => `${count} 字元`,
      usageCount: (count: number) => `使用 ${count} 次`,
      favorited: '已收藏',
      notFavorited: '未收藏',
      noAnnotationSummary: '無批註',
      annotationSummary: (count: number) => `${count} 條批註`,
      viewHistory: '查看歷史版本',
      historyVersions: '歷史版本',
      content: '內容',
      sourceMode: '原始碼模式',
      liveMode: 'Live Preview',
      previewMode: '預覽模式',
      toggleMarkdownMode: '切換 Markdown 顯示模式',
      editPrompt: '編輯 Prompt',
      doubleClickToEdit: '雙擊進入編輯',
      createPromptTitle: '新建 Prompt',
      title: '標題',
      titlePlaceholder: '輸入 Prompt 標題...',
      add: '新增',
      tagNamePlaceholder: '標籤名稱',
      removeTag: '移除標籤',
      removeTagAria: (tag: string) => `移除標籤 ${tag}`,
      contentPlaceholder: '輸入 Prompt 內容...',
      promptContent: 'Prompt 內容',
      enterTitle: '請輸入標題',
      enterContent: '請輸入內容',
      saving: '儲存中...',
      save: '儲存',
      create: '建立',
      fullscreenEdit: '全螢幕編輯',
      exitFullscreen: '退出全螢幕',
      loading: '載入中...',
      noContent: '暫無內容',
      renderFailed: '渲染失敗',
      loadPromptsFailed: '載入 Prompts 失敗',
      permissionDenied: '未授予目錄存取權限',
      openDirectoryFailed: '開啟目錄失敗',
      workspacePermissionExpired: '目錄存取權限已過期，請重新選擇資料目錄',
      noPromptsFound: '沒有找到 Prompts',
      emptyPromptHint: '嘗試調整搜尋條件或建立一個新的 Prompt',
      batchDeleteConfirm: (count: number) =>
        `確定要將 ${count} 個 Prompt 移動到 .trash 嗎？`,
      selectedCount: (count: number) => `已選擇 ${count} 個`,
      toggleSelectAll: '全選/取消全選',
      clear: '清除',
      confirmDelete: '確認刪除',
      deletePromptConfirm: (title: string) => `確定要刪除 Prompt ${title} 嗎？`,
      deletePromptNote: '此操作會將檔案移動到 .trash 目錄，並從目前列表中移除。',
      historyLoadFailed: '讀取歷史版本失敗',
      historyCopyFailed: '複製歷史版本失敗',
      historyRestoreFailed: '還原歷史版本失敗',
      restore: '還原',
      restoring: '還原中...',
      selectHistoryVersion: '請選擇歷史版本',
      noHistoryVersions: '暫無歷史版本',
      exportTitle: '匯出 Prompts',
      noExportablePrompts: '沒有可匯出的 Prompt',
      exportFailed: '匯出失敗',
      exportScope: '匯出範圍',
      selectedScope: (count: number) => `已選 ${count}`,
      filteredScope: (count: number) => `目前篩選 ${count}`,
      allScope: (count: number) => `全部 ${count}`,
      exportFormat: '匯出格式',
      exportCount: (count: number) => `將匯出 ${count} 個 Prompt`,
      exporting: '匯出中...',
      export: '匯出',
      shareImageTitle: '生成分享圖片',
      shareTemplate: '卡片模板',
      shareOptions: '分享選項',
      showAuthorInfo: '顯示作者資訊',
      showPromptClipLogo: '顯示 PromptClip 標誌',
      showPromptTags: '顯示筆記中的標籤',
      renderMarkdown: '渲染 Markdown',
      shareRightClickHint: '可右鍵點擊預覽圖片儲存或複製',
      downloadImage: '下載圖片',
      copyImage: '複製圖片',
      generatingImage: '生成中...',
      shareImageDownloaded: '圖片已下載',
      shareImageCopied: '圖片已複製',
      shareImageGenerateFailed: '生成分享圖片失敗',
      shareImageCopyFailed: '複製圖片失敗',
      sharePreviewMissing: '未找到分享圖片預覽區域',
      shareContentTruncated: '內容已截斷至 2000 字元。',
      shareIncludeAnnotations: '包含批註',
      shareNoAnnotations: '此 Prompt 尚無批註',
      annotations: '批註',
      noAnnotations: '暫無批註',
      annotationText: '批註內容',
      annotationPlaceholder: '記錄這條 Prompt 的使用效果...',
      saveAnnotation: '儲存批註',
      savingAnnotation: '儲存中...',
      addImage: '新增圖片',
      removeImage: '移除圖片',
      editAnnotation: '編輯批註',
      deleteAnnotation: '刪除批註',
      annotationDeleteConfirm: '確定要刪除這條批註嗎？',
      annotationLoadFailed: '讀取批註失敗',
      annotationSaveFailed: '儲存批註失敗',
      annotationImageTooLarge: '圖片不能超過 5MB',
      annotationImageOnly: '僅支援圖片附件',
      annotationImageSelected: (name: string) => `已選擇 ${name}`,
      annotationCreatedAt: (time: string) => `建立於 ${time}`,
      annotationUpdatedAt: (time: string) => `編輯於 ${time}`,
      annotationImageAlt: (name: string) => `批註圖片 ${name}`,
      openAnnotationImage: '放大查看圖片',
      closeAnnotationImage: '關閉圖片預覽',
      expandAnnotation: '展開',
      collapseAnnotation: '收起',
      commandNewPrompt: '新建 Prompt',
      commandSearchPrompts: '搜尋 Prompts',
      commandInputPlaceholder: '輸入指令或搜尋...',
      commandNoMatches: '未找到符合的指令',
      commandActionGroup: '操作',
      commandTitleGroup: '標題',
      commandRecentGroup: '最近使用',
      commandSearchGroup: '搜尋',
      fullTextSearch: (query: string) => `全文搜尋「${query}」`,
      navigate: '導航',
      selectCommand: '選擇',
      closeCommand: '關閉',
      welcomeBadgeOne: '高效管理',
      welcomeBadgeTwo: '智慧組織',
      welcomeBadgeThree: '隨時調用',
      welcomeSubtitle: '你的個人 Prompt 管理工具',
      welcomeDescription: '集中管理你的靈感與提示詞，結構化組織、快速檢索。',
      unsupportedBrowserTitle: '目前瀏覽器不支援',
      unsupportedBrowserDescription: '讀寫本地檔案。請使用 Chrome 或 Edge 86+ 存取。',
      chooseDataDirectory: '選擇資料目錄',
      localOnlyNote: '所有資料僅儲存在本地，不會上傳到任何伺服器',
      downloadClientDivider: '或下載用戶端',
      downloadIOS: 'iOS App',
      downloadDesktop: '桌面版',
      featureLocalTitle: 'Local First',
      featureLocalDescription: ['資料儲存在本地，隱私安全，資料只屬於你。'],
      featureFastTitle: 'File over app',
      featureFastDescription: ['採用完全開放的 Markdown 檔案儲存資料，自由遷移。'],
      featureMarkdownTitle: '多端APP',
      featureMarkdownDescription: ['Web App、iOS（iPhone/iOS）、Windows、Mac。'],
    },
    settings: {
      title: '設定',
      generalTab: '一般',
      backupTab: '備份',
      backupTitle: '備份',
      backupDescription: '將完整工作區增量備份到專用的 WebDAV 目錄。',
      backupDesktopOnly: '備份功能僅在桌面版中可用。',
      backupName: '目標名稱',
      backupUrl: 'WebDAV 位址（HTTPS）',
      backupUsername: '使用者名稱',
      backupPassword: '密碼',
      backupPasswordPlaceholder: '留空以使用系統鑰匙圈中的密碼',
      backupRemotePath: '遠端專用目錄',
      backupTestConnection: '測試連線',
      backupTesting: '正在測試連線…',
      backupInProgress: '正在備份，請勿關閉應用程式…',
      restoreInProgress: '正在還原，請勿關閉應用程式…',
      backupConnectionSucceeded: '連線成功',
      backupRemoteDirectoryNotFound: '請確認路徑正確，且遠端專用目錄已建立。',
      backupNow: '立即備份',
      backupRestore: '完整還原',
      backupNoWorkspace: '請先選擇本機工作區',
      backupCancelled: '已取消',
      restoreConfigConflictTitle: '還原工作區設定',
      restoreConfigConflict: '所選目錄已有 promptclip.config.json，是否以備份中的設定覆蓋？',
      restoreConfigOverwrite: '覆蓋',
      restoreConfigSkip: '略過',
      backupSucceeded: (uploaded: number, deleted: number) =>
        `備份完成：上傳 ${uploaded} 個，刪除 ${deleted} 個`,
      restoreSucceeded: (restored: number, unchanged: number, skipped: number) =>
        `還原完成：寫入 ${restored} 個，略過 ${unchanged} 個未變更檔案，保留 ${skipped} 個檔案`,
      aboutTab: '關於',
      reset: '恢復預設設定',
      save: '儲存設定',
      saving: '儲存中...',
      saved: '設定已儲存',
      saveFailed: '儲存設定失敗',
      generalTitle: '一般設定',
      generalDescription: '管理 PromptClip 的一般行為和偏好設定',
      languageTitle: '語言',
      languageDescription: '切換 PromptClip 的介面顯示語言。',
      shareAuthorTitle: '分享作者',
      shareAuthorDescription: '用於分享圖片左上角的作者名稱。留空時不會顯示作者資訊。',
      shareAuthorPlaceholder: '輸入作者名稱',
      chinese: '中文',
      english: '英文',
      historyTitle: '歷史版本',
      fileWatchingTitle: '自動監聽檔案變動',
      fileWatchingDescription:
        '開啟後，工作區中的 Markdown 檔案由外部新增、修改或刪除時，PromptClip 會自動更新介面。',
      fileWatchingAriaLabel: '自動監聽檔案變動',
      fileWatchingNote:
        'Web 端透過定時檢查實作，可能有短暫延遲；關閉後會在重新開啟工作區時讀取外部變化。',
      analyticsTitle: '使用統計',
      analyticsDescription:
        '協助了解功能使用情形。僅匿名上報頁面造訪與功能使用計數，不收集 Prompt 內容。僅 Web 端生效。',
      analyticsAriaLabel: '使用統計',
      analyticsNote:
        '基於 Google Analytics 4，IP 位址匿名化處理。關閉後不再新增上報，已發事件無法撤回。',
      historyDescription: '預設關閉。啟用後，後續版本會在編輯筆記時保留歷史快照。',
      historyAriaLabel: '啟用歷史版本',
      historyNote: '關閉後不會自動建立歷史目錄和歷史快照；保留天數目前僅儲存設定，暫不自動清理。',
      retentionDays: '保留天數',
      days: (days: number) => `${days} 天`,
      maintenanceTitle: '資料夾維護',
      metadataPromptTitle: '發現中繼資料問題',
      metadataPromptDescription: (count: number) =>
        `發現 ${count} 個 Markdown 檔案缺少或包含無效的 PromptClip 中繼資料。`,
      metadataPromptIgnore: '本次忽略',
      metadataPromptView: '查看詳情',
      metadataPromptRepair: '自動修復',
      maintenanceDescription:
        '掃描 Obsidian 建立的 Markdown，補全 PromptClip 需要的 frontmatter。',
      scanMetadata: '掃描元資料',
      scanningMetadata: '掃描中...',
      scanFailed: '掃描元資料失敗',
      scanEmpty: '掃描後會列出缺少或無效的 PromptClip 元資料，不會立即修改檔案。',
      scanHealthy: (count: number) => `共掃描 ${count} 個 Markdown 檔案，目前無需補全。`,
      scanRepairable: (total: number, repairable: number) =>
        `共掃描 ${total} 個 Markdown 檔案，${repairable} 個檔案需要補全。`,
      missingFields: '缺失',
      invalidFields: '無效',
      hiddenIssues: (count: number, limit: number) =>
        `還有 ${count} 個檔案未顯示，列表最多顯示前 ${limit} 個。`,
      repairMetadata: '補全缺失元資料',
      repairingMetadata: '補全中...',
      repairConfirm: (count: number) =>
        `將補全 ${count} 個檔案的缺失元資料。已有欄位和正文會保留，是否繼續？`,
      repairSucceeded: (count: number) => `已補全 ${count} 個檔案`,
      repairFailed: '補全元資料失敗',
      emptyField: '無',
      aboutTitle: 'PromptClip',
      aboutDescription: '為 AI 時代而構建的個人 Prompt 工作空間',
      aboutIntroParagraphs: [
        'AI 對話隨時會消失在資訊流裡。但真正重要的 Prompt、思考與工作流，本就不該隨之消散。',
        'PromptClip 讓這些內容在你的檔案系統中持續生長：快速記錄，便捷檢索，持續複用，長期演化。',
      ],
      aboutFileTitle: 'File over app / 文件，高於應用',
      aboutFileParagraphs: [
        'PromptClip 將內容儲存為完全開放的 Markdown 檔案。',
        '你可以用任意編輯器開啟、修改它們，也可以像普通檔案一樣進行備份、同步、遷移與版本管理。',
        '它能夠與 Obsidian 等 Markdown 筆記工具自然協同，不將你的資料鎖在任何封閉平台裡。',
      ],
      aboutLocalTitle: 'Local First / 本地優先',
      aboutLocalParagraphs: [
        '所有檔案直接留在你自己的裝置上。',
        '無需雲端資料庫，無需帳號系統，不綁定任何線上平台。',
        '你的資料，百分之百屬於你。',
      ],
      aboutCommitment:
        '以上是一種自我保障的承諾，工具可能會消失，資料永遠屬於你。',
      quickSearch: {
        title: '快速搜尋',
        description:
          '在任何應用程式中以全域快捷鍵呼出搜尋浮窗，搜尋後可貼上至游標處或在主視窗開啟詳情。',
        enabledLabel: '啟用全域搜尋框',
        enabledDescription: '關閉後不會註冊全域快捷鍵，也不會從其他應用程式呼出搜尋浮窗。',
        shortcutLabel: '呼出快捷鍵',
        shortcutRecord: '點擊錄入',
        shortcutRecording: '請按下組合鍵…',
        shortcutReset: '恢復預設',
        shortcutUpdateFailed: '快捷鍵無效或被佔用，請重試',
        macPermissionLabel: 'macOS 輔助使用權限',
        macPermissionGranted: '已授權',
        macPermissionOpen: '打開系統設定',
        macPermissionHint: '自動貼上需要輔助使用權限；授權後返回 PromptClip，狀態會自動更新。',
        placeholder: '搜尋 Prompt…',
        noResults: '無符合結果',
        resultsLabel: '搜尋結果',
        paste: '貼上',
        openDetail: '在主應用程式中開啟詳情',
      },
    },
    skills: {
      title: 'Skills',
      hubSkillCount: (count: number) => `已管理 ${count} 個 Skills`,
      managePrompts: '管理 Prompts',
      manageSkills: '管理 Skills',
      searchPlaceholder: '依名稱搜尋 Skills',
      all: '全部',
      favorites: '收藏',
      clearFilter: '清除篩選',
      agents: 'Agents',
      noAgents: '未偵測到已安裝的 Agent',
      moreTools: '更多',
      refresh: '掃描 Skills',
      refreshHint: '掃描本機 Agents 已有 Skills 並匯入',
      create: '新增 Skill',
      upload: '上傳 Skill',
      settings: '同步設定',
      loading: '正在載入 Skills…',
      noSkills: '尚無 Skills',
      noSkillsHint: '掃描、新增或上傳 Skills，開始統一管理 Agent Skills。',
      noMatchingSkills: '沒有符合的 Skills',
      noMatchingSkillsHint: '嘗試調整搜尋關鍵字或切換其他篩選條件。',
      favorite: '收藏 Skill',
      unfavorite: '取消收藏 Skill',
      enableFor: (tool: string) => `為 ${tool} 啟用`,
      disableFor: (tool: string) => `為 ${tool} 停用`,
      resyncFor: (tool: string) => `重新同步到 ${tool}`,
      repairBrokenFor: (tool: string) => `修復 ${tool} 中損壞的連結`,
      repairBroken: '修復連結',
      confirmRepairBroken: (skill: string, tool: string, path: string) =>
        `確認修復 ${tool} 中損壞的 Skill「${skill}」連結嗎？\n\n目標：${path}\n\nPromptClip 將移除已失效的連結並重新建立同步目標。`,
      forceOverwriteFor: (tool: string) => `強制覆蓋 ${tool} 中的 Skill`,
      forceOverwrite: '強制覆蓋',
      confirmForceOverwrite: (skill: string, tool: string, path: string) =>
        `確認強制覆蓋 ${tool} 中的 Skill「${skill}」嗎？\n\n目標：${path}\n\n現有的同名檔案、目錄或連結將由 PromptClip 取代，操作成功後無法復原。`,
      fromAgentsSkills: '來自 Agents Skills',
      alsoInAgentsSkills: '也在 Agents Skills 中啟用',
      fromAgentsSkillsTooltip: (tool: string) =>
        `該 Skill 透過通用 Agents Skills（~/.agents/skills）對 ${tool} 生效`,
      alsoInAgentsSkillsTooltip: (tool: string) =>
        `該 Skill 同時存在於 ${tool} 專屬目錄與通用 Agents Skills（~/.agents/skills）中`,
      duplicateSharedEnableTitle: (tool: string) => `確認重複為 ${tool} 啟用`,
      enableAnyway: '仍然啟用',
      confirmDuplicateSharedEnable: (skill: string, tool: string) =>
        `Skill「${skill}」已透過 Agents Skills（~/.agents/skills）對 ${tool} 生效。\n\n繼續啟用會在 ${tool} 的專屬目錄中再同步一份，為避免重複載入建議直接沿用 Agents Skills。仍要繼續嗎？`,
      agentCountTooltipWithShared: (tool: string, total: number, shared: number) =>
        `${tool}（共 ${total} 個，其中 ${shared} 個來自 Agents Skills）`,
      pendingFor: (tool: string) => `${tool} 正在同步`,
      statusEnabled: '已啟用',
      statusDisabled: '未啟用',
      statusStale: '需要同步',
      statusBroken: '連結損壞',
      statusConflict: '存在衝突',
      quickSwitch: '快速切換',
      scanExternal: '檢查 Agent 中的新 Skills',
      export: '匯出 ZIP',
      importTitle: '匯入 Agent Skills',
      importSummary: (total: number, existing: number, added: number) =>
        `掃描到 ${total} 個 Skills，其中 ${existing} 個已存在、${added} 個新增`,
      existingSkills: '已存在',
      newSkills: '新增',
      keepHub: '保留 PromptClip 版本',
      useExternal: '使用此外部版本',
      skipImport: '略過',
      confirmImport: '確認匯入',
      importing: '正在匯入…',
      importingProgress: (current: number, total: number) => `正在匯入 (${current}/${total})…`,
      importingProgressDetail: (skill: string, current: number, total: number) =>
        `正在匯入 ${skill}（第 ${current}/${total} 個）`,
      close: '關閉',
      sourceCount: (count: number) => `${count} 個來源`,
      invalidExternalEntries: (count: number) => `${count} 個外部 Skill 無法掃描`,
      invalidBrokenLinkCountBadge: (count: number) => `含 ${count} 個可清理的失效連結`,
      invalidGroupTitle: (code: string) => {
        switch (code) {
          case 'skill_external_link_invalid':
            return '失效符號連結';
          case 'skill_markdown_invalid_type':
            return '入口檔案為符號連結';
          case 'skill_content_symlink':
            return '內部包含符號連結';
          case 'invalid_skill_id':
            return '目錄名不符合規範';
          case 'skill_name_mismatch':
            return '名稱與目錄名不一致';
          case 'skill_markdown_missing':
            return '缺少 SKILL.md 入口檔案';
          default:
            return '其他無法掃描項';
        }
      },
      invalidGroupHint: (code: string) => {
        switch (code) {
          case 'skill_external_link_invalid':
            return '這些軟連結指向的目標已不存在或不是資料夾，可直接安全清理。';
          case 'skill_markdown_invalid_type':
            return '入口檔案 SKILL.md 為符號連結（常見於外部外掛套件產生的子 Skill），建議保持由原工具管理，暫不匯入。';
          case 'skill_content_symlink':
            return '目錄內包含符號連結（常見於自帶 node_modules 等依賴的外掛倉庫），為避免破壞執行環境暫不匯入，建議保持由原工具管理。';
          default:
            return null;
        }
      },
      cleanupBrokenLink: '清理連結',
      cleanupAllBrokenLinks: '一鍵清理全部',
      cleaningBrokenLinks: '正在清理…',
      confirmCleanupBrokenLinkTitle: '清理失效符號連結',
      confirmCleanupBrokenLink: (name: string, path: string) =>
        `確認清理失效符號連結「${name}」嗎？\n\n路徑：${path}\n\n僅移除已中斷的符號連結本身，不會刪除任何正常資料夾。`,
      confirmCleanupAllBrokenLinks: (count: number) =>
        `確認清理全部 ${count} 個失效符號連結嗎？\n\n僅移除已中斷的符號連結本身，不會刪除任何正常資料夾。`,
      cleanupBrokenLinksSuccess: (count: number) => `已清理 ${count} 個失效符號連結`,
      skillScanError: (code: string, params: Record<string, string>) => {
        switch (code) {
          case 'invalid_skill_id':
            return `目錄名「${params.skillId ?? ''}」不是合法的 Skill 名稱（僅允許字母、數字、-、_、.、@、:，不能以 . 開頭或結尾，最長 128 個字元）。`;
          case 'skill_name_mismatch':
            return `元資料 name「${params.metadataName ?? ''}」與目錄名「${params.directoryName ?? ''}」不一致。`;
          case 'skill_markdown_missing':
            return '缺少 Skill 入口檔案（SKILL.md）。';
          case 'skill_markdown_invalid_type':
            return 'Skill 入口檔案必須是普通檔案，不能是連結。';
          case 'skill_source_invalid':
            return '該 Skill 目錄既不是資料夾，也不是有效的連結。';
          case 'skill_external_link_invalid':
            return '符號連結已中斷或未指向資料夾。';
          case 'skill_frontmatter_missing':
            return 'Skill 檔案缺少 YAML frontmatter（必須以「---」開頭）。';
          case 'skill_frontmatter_unclosed':
            return 'YAML frontmatter 未閉合（缺少結尾的「---」）。';
          case 'skill_frontmatter_invalid':
            return 'YAML frontmatter 解析失敗（必須包含 name 和 description）。';
          case 'skill_description_empty':
            return 'Skill 描述為空。';
          case 'skill_content_symlink':
            return `Skill 內部包含符號連結（「${params.path ?? ''}」），通常為自帶依賴的外掛倉庫，建議保持原工具管理。`;
          case 'skill_content_special_file':
            return `Skill 內部包含不支援的特殊檔案（「${params.path ?? ''}」）。`;
          case 'skill_io_error':
            return `執行 ${params.operation ?? ''} 時發生檔案系統錯誤：${params.message ?? ''}`;
          case 'skill_path_outside_root':
            return 'Skill 目錄結構無效。';
          default:
            return '該 Skill 無法掃描，請檢查其目錄結構。';
        }
      },
      revealExternalPath: (path: string) => `在檔案管理器中顯示 ${path}`,
      createTitle: '新增 Skill',
      skillName: 'Skill 名稱',
      skillNameHint: '僅支援小寫字母、數字和單個連字號，最長 64 個字元。',
      skillDescription: 'Skill 描述',
      cancel: '取消',
      confirmCreate: '建立並開啟',
      archiveTitle: '上傳 Skill 封存檔',
      archiveConflict: 'PromptClip 中已有同名 Skill，請選擇保留的版本。',
      confirmArchiveImport: '確認匯入',
      backToSkills: '返回 Skills',
      revealSkillFolder: '在檔案管理器中開啟 Skill 目錄',
      newFolder: '新增資料夾',
      newFile: '新增文字檔',
      uploadFile: '上傳檔案',
      rename: '重新命名',
      delete: '刪除',
      deleteSkill: '刪除 Skill',
      deleteSkillTitle: '刪除 Skill',
      deleteSkillConfirm: (skill: string) => `確定刪除「${skill}」嗎？`,
      deleteSkillNote: '此操作會從 PromptClip 中永久刪除此 Skill，且無法復原。',
      deleteManagedSkillNote:
        '此 Skill 正在 Agent 工具中使用。你可以同時刪除所有受管理副本，或保留 Agent 中的 Skill；符號連結將轉換為獨立副本。',
      deleteEverywhere: '全部刪除',
      deletePromptClipOnly: '僅從 PromptClip 刪除',
      download: '下載',
      save: '儲存',
      edit: '編輯',
      preview: '預覽',
      binaryNoPreview: '此檔案無法在應用程式內預覽，可下載後使用其他應用程式開啟。',
      selectFile: '從左側選擇一個檔案',
      unsavedChanges: '有未儲存的修改，確定放棄嗎？',
      syncPartialFailure: '檔案已儲存，但部分複製目標同步失敗。',
      operationFailed: '操作失敗，請重試。',
      scanNoExternalFound: '掃描完成，未發現需要匯入的外部 Skill。',
      skillOperationError: (code: string, params: Record<string, string>) => {
        switch (code) {
          case 'skill_already_exists':
            return '已存在同名 Skill，請更換名稱。';
          case 'skill_symlink_permission_denied':
            return '建立符號連結權限不足：在 Windows 上請開啟「開發人員模式」，或在同步設定中改用「檔案複製」。';
          case 'skill_file_conflict':
            return '檔案已被外部程式修改，已取消儲存以避免覆蓋；請重新載入後再編輯。';
          case 'skill_file_too_large':
            return '檔案超過大小上限，無法讀取或上傳。';
          case 'skill_file_not_text':
            return '此檔案類型不支援在應用程式內以文字編輯。';
          case 'skill_file_not_utf8':
            return '此檔案不是有效的 UTF-8 文字，無法在應用程式內編輯。';
          case 'skill_entry_exists':
            return '目標位置已存在同名檔案或資料夾。';
          case 'skill_entry_protected':
            return '核心入口檔案 SKILL.md 受保護，不能重新命名或刪除。';
          case 'skill_archive_multiple_roots':
            return '壓縮檔內包含多個頂層目錄，每次僅支援匯入單一 Skill。';
          case 'skill_archive_too_large':
            return '壓縮檔超過 50 MiB 上限，無法匯入。';
          case 'skill_archive_expanded_too_large':
            return '壓縮檔解壓後超過 200 MiB 上限，無法匯入。';
          case 'skill_archive_too_many_entries':
            return '壓縮檔內檔案數量超過 5,000 個上限，無法匯入。';
          case 'skill_archive_unsafe_path':
          case 'skill_archive_special_entry':
            return '壓縮檔包含不安全的路徑或特殊連結項目，已拒絕匯入。';
          case 'skill_archive_extension_invalid':
            return '僅支援匯入 .zip 或 .skill 格式的壓縮檔。';
          case 'skill_archive_invalid':
            return '壓縮檔無效或已損壞，無法解析。';
          case 'skill_target_conflict':
            return '目標工具目錄中存在非 PromptClip 管理的同名內容，請點擊工具圖示確認後再處理。';
          case 'skill_target_group_mode_conflict':
            return '共用同一目錄的多個工具設定了不同的同步方式，請先在設定中統一。';
          case 'skill_custom_tool_name_required':
            return '請輸入自訂工具名稱。';
          case 'skill_custom_tool_path_required':
            return '請輸入自訂工具的 Skills 目錄路徑。';
          case 'skill_custom_tool_path_not_absolute':
          case 'skill_custom_tool_path_invalid':
            return '自訂工具的 Skills 目錄必須是合法的絕對路徑。';
          case 'skill_custom_tool_duplicate':
            return '已存在同名或同路徑的自訂工具。';
          case 'skill_category_name_required':
            return '分類名稱不能為空。';
          case 'skill_category_name_too_long':
            return '分類名稱過長。';
          case 'skill_category_name_duplicate':
            return '分類名稱已存在。';
          case 'skill_category_name_reserved':
            return '此名稱為保留名稱，請改用其他名稱。';
          case 'skill_source_changed':
            return '外部 Skill 內容已發生變化，請重新掃描後再匯入。';
          case 'skill_io_error':
            return params.message
              ? `檔案讀寫失敗：${params.message}`
              : '檔案讀寫失敗，請檢查目錄權限後重試。';
          default:
            return params.message
              ? `操作失敗：${params.message}`
              : '操作失敗，請重試。';
        }
      },
      invalidSkillName: 'Skill 名稱格式不正確。',
      exportSuccess: 'Skill 已匯出。',
      protected: '受保護',
      defaultSyncMode: '預設同步方式',
      inheritMode: '跟隨全域預設',
      symlinkMode: '符號連結',
      copyMode: '檔案複製',
      settingsTitle: '設定',
      syncTab: '同步設定',
      syncDescription: '設定 Skills 寫入 Agent 工具的方式。',
      storageTab: '資料儲存',
      storageDescription: 'PromptClip 將所有 Skill 保存在本機資料夾中。',
      storagePath: '儲存位置',
      storageOpen: '在檔案管理器中開啟',
      storageDesktopOnly: '資料儲存僅在桌面版中可用。',
      storageOpenFailed: '開啟失敗，請重試。',
      saveSettings: '儲存設定',
      migrationHint: '儲存後，已啟用的 Skills 將遷移到新的同步方式；失敗項可再次重試。',
      agentNotInstalled: '未安裝',
      uninstalledAgents: (count: number) => `未偵測到安裝的 Agent（${count}）`,
      enableAgent: (tool: string) => `啟用 ${tool}`,
      disableAgent: (tool: string) => `停用 ${tool}`,
      agentDisabledHint: '已停用的 Agent 不會出現在 Skill 卡片和導航列，也不會參與同步。',
      customTools: '自訂工具',
      customToolHint: '新增尚未內建支援的 Agent 工具：填寫名稱與該工具讀取 Skills 的目錄路徑。',
      customToolName: '工具名稱',
      customToolNamePlaceholder: '例如 MyAgent',
      customToolPath: 'Skills 目錄路徑',
      customToolPathPlaceholder: '該 Agent 讀取 Skills 的目錄絕對路徑',
      customToolSelectPath: '選擇目錄',
      customToolAdd: '新增',
      customToolRemove: '刪除自訂工具',
      dragHandle: '拖曳以重新排序',
      dragHint: '拖曳手柄可調整 Agent 順序，主介面卡片與導航列將同步更新。',
      // Skill 編輯頁：檔案操作對話框 / 右鍵選單
      newFolderTitle: '新增資料夾',
      newFileTitle: '新增文字檔',
      renameTitle: '重新命名',
      folderName: '資料夾名稱',
      fileName: '檔案名稱',
      namePlaceholder: '請輸入名稱',
      confirm: '確定',
      deleteEntryConfirm: (name: string) => `確定刪除「${name}」嗎？`,
      deleteEntryNote: '此操作無法復原。',
      dropHint: '拖曳檔案到此處匯入',
      dropFolderUnsupported: '暫不支援拖入資料夾，請選擇檔案。',
      dropConflictSkipped: (count: number) => `${count} 個檔案因同名已存在被跳過。`,
      dropMoveIntoSelf: '不能移動到自身或其子目錄中。',
      dropConflictMove: (name: string) => `「${name}」同名已存在，移動失敗。`,
      categories: '分類',
      defaultCategory: '預設類別',
      addCategory: '新建分類',
      categoryName: '分類名稱',
      categoryNamePlaceholder: '輸入分類名稱',
      renameCategory: '重新命名分類',
      deleteCategory: '刪除分類',
      deleteCategoryConfirm: (name: string) => `確定刪除分類「${name}」嗎？`,
      deleteCategoryNote: '此分類下的 Skill 會自動回到「預設類別」，不會被刪除。',
      addToCategory: '加入分類',
      newCategory: '新建分類',
      selectAll: '全選',
      deselectAll: '全不選',
      noSkillsInCategory: '此分類下暫無 Skill',
      noCategoriesYet: '尚無自訂分類，在下方輸入名稱即可快速建立',
      quickCreateCategoryPlaceholder: '輸入新分類名',
      categoryNameRequired: '分類名稱不能為空',
      categoryNameTooLong: '分類名稱過長',
      categoryNameDuplicate: '分類名稱已存在',
      categoryNameReserved: '此名稱為保留名稱，請改用其他名稱',
    },
    metadataFields: {
      id: 'ID',
      title: '標題',
      tags: '標籤',
      created: '建立時間',
      modified: '修改時間',
      copy_count: '複製次數',
      pinned: '收藏狀態',
    } satisfies Record<PromptMetadataField, string>,
    recycle: {
      title: '回收站',
      commandOpen: '開啟回收站',
      empty: '回收站為空',
      emptyAll: '全部清空',
      view: '檢視',
      restore: '還原',
      permanentDelete: '永久刪除',
      closeDetail: '關閉詳情',
      hasAnnotationsBadge: '含批註',
      loading: '載入中...',
      permanentlyDeleted: '已永久刪除',
      allCleared: '回收站已清空',
      restoreSuffix: (counter: number) => `-還原${counter}`,
      deletedAt: (date: string) => `刪除於 ${date}`,
      confirmRestore: (title: string) => `確定還原 "${title}" 嗎？`,
      confirmPermanentDelete: (title: string) =>
        `確定永久刪除 "${title}" 嗎？此操作不可撤銷。`,
      confirmEmptyAll: '確定清空回收站嗎？所有檔案將被永久刪除。',
      restored: (title: string) => `已還原 "${title}"`,
      restoreFailed: '還原失敗，請重試',
      deleteFailed: '刪除失敗，請重試',
      emptyFailed: '部分操作失敗，請重試',
    },
    markdownEditor: {
      slashMenuLabel: '斜線插入命令',
      slashMenuClose: '關閉斜線選單',
      toolbarLabel: 'Markdown 格式工具列',
      toolbar: {
        h1: '一級標題',
        h2: '二級標題',
        h3: '三級標題',
        bold: '粗體',
        italic: '斜體',
        inlineCode: '行內程式碼',
        link: '連結',
        ul: '無序清單',
        ol: '有序清單',
        quote: '引用',
        codeBlock: '程式碼區塊',
        task: '任務清單',
      },
      slash: {
        h1: '一級標題',
        h2: '二級標題',
        h3: '三級標題',
        bold: '粗體',
        italic: '斜體',
        inlineCode: '行內程式碼',
        link: '連結',
        ul: '無序清單',
        ol: '有序清單',
        quote: '引用',
        codeBlock: '程式碼區塊',
        task: '任務清單',
        noMatch: '無符合命令',
      },
    },
  },
  'en-US': {
    common: {
      cancel: 'Cancel',
    },
    app: {
      prompts: 'Prompts',
      skills: 'Skills',
      noWorkspace: 'No folder selected',
      tags: 'Tags',
      pinnedTags: 'Pinned tags',
      allTags: 'All tags',
      noTags: 'No tags',
      localStorage: 'Data is stored locally',
      expandStorage: 'Expand data folder details',
      collapseStorage: 'Collapse data folder details',
      openSettings: 'Open settings',
      collapseSidebar: 'Collapse sidebar',
      expandSidebar: 'Expand sidebar',
      switchFolder: 'Switch folder',
      searchPlaceholder: 'Quick search',
      quickSwitch: 'Quick switch',
      quickSwitchAria: (shortcut: string) => `Quick switch ${shortcut}`,
      clearSearch: 'Clear search',
      searchResultCount: (count: number) => `${count} results found`,
      exportPrompts: 'Export prompts',
      createPrompt: 'New prompt (Cmd+N)',
      all: 'All',
      recent: 'Recent',
      favorites: 'Favorites',
      select: 'Select',
      deselect: 'Deselect',
      favorite: 'Favorite',
      unfavorite: 'Unfavorite',
      moreActions: 'More actions',
      edit: 'Edit',
      delete: 'Delete',
      sharePrompt: 'Share',
      copyPromptContent: 'Copy prompt content',
      copy: 'Copy',
      copied: 'Copied',
      tagActions: 'Tag actions',
      pin: 'Pin',
      unpin: 'Unpin',
      rename: 'Rename',
      deleteTag: 'Delete tag',
      renameTagPrompt: 'Enter a new tag path',
      removeTagConfirm: (tag: string) => `Remove tag #${tag} from related prompts?`,
      detailPanel: 'Details',
      noPromptSelected: 'No prompt selected',
      close: 'Close',
      resizeDrawer: 'Resize drawer',
      dragResize: 'Drag to resize',
      characterCount: (count: number) => `${count} characters`,
      usageCount: (count: number) => `Used ${count} times`,
      favorited: 'Favorited',
      notFavorited: 'Not favorited',
      noAnnotationSummary: 'No annotations',
      annotationSummary: (count: number) =>
        `${count} ${count === 1 ? 'annotation' : 'annotations'}`,
      viewHistory: 'View history versions',
      historyVersions: 'History versions',
      content: 'Content',
      sourceMode: 'Source mode',
      liveMode: 'Live Preview',
      previewMode: 'Preview mode',
      toggleMarkdownMode: 'Switch Markdown display mode',
      editPrompt: 'Edit prompt',
      doubleClickToEdit: 'Double-click to edit',
      createPromptTitle: 'New prompt',
      title: 'Title',
      titlePlaceholder: 'Enter prompt title...',
      add: 'Add',
      tagNamePlaceholder: 'Tag name',
      removeTag: 'Remove tag',
      removeTagAria: (tag: string) => `Remove tag ${tag}`,
      contentPlaceholder: 'Enter prompt content...',
      promptContent: 'Prompt content',
      enterTitle: 'Enter a title',
      enterContent: 'Enter content',
      saving: 'Saving...',
      save: 'Save',
      create: 'Create',
      fullscreenEdit: 'Fullscreen editor',
      exitFullscreen: 'Exit fullscreen',
      loading: 'Loading...',
      noContent: 'No content',
      renderFailed: 'Render failed',
      loadPromptsFailed: 'Failed to load prompts',
      permissionDenied: 'Folder access was not granted',
      openDirectoryFailed: 'Failed to open folder',
      workspacePermissionExpired: 'Folder access expired. Choose the data folder again.',
      noPromptsFound: 'No prompts found',
      emptyPromptHint: 'Adjust the search filters or create a new prompt.',
      batchDeleteConfirm: (count: number) =>
        `Move ${count} prompts to .trash?`,
      selectedCount: (count: number) => `${count} selected`,
      toggleSelectAll: 'Select all / deselect all',
      clear: 'Clear',
      confirmDelete: 'Confirm delete',
      deletePromptConfirm: (title: string) => `Delete prompt ${title}?`,
      deletePromptNote:
        'This moves the file to the .trash folder and removes it from the current list.',
      historyLoadFailed: 'Failed to read history versions',
      historyCopyFailed: 'Failed to copy history version',
      historyRestoreFailed: 'Failed to restore history version',
      restore: 'Restore',
      restoring: 'Restoring...',
      selectHistoryVersion: 'Select a history version',
      noHistoryVersions: 'No history versions',
      exportTitle: 'Export prompts',
      noExportablePrompts: 'No prompts to export',
      exportFailed: 'Export failed',
      exportScope: 'Export scope',
      selectedScope: (count: number) => `Selected ${count}`,
      filteredScope: (count: number) => `Current filter ${count}`,
      allScope: (count: number) => `All ${count}`,
      exportFormat: 'Export format',
      exportCount: (count: number) => `Exporting ${count} prompts`,
      exporting: 'Exporting...',
      export: 'Export',
      shareImageTitle: 'Share image',
      shareTemplate: 'Card template',
      shareOptions: 'Share options',
      showAuthorInfo: 'Show author info',
      showPromptClipLogo: 'Show PromptClip logo',
      showPromptTags: 'Show prompt tags',
      renderMarkdown: 'Render Markdown',
      shareRightClickHint: 'Right-click the preview image to save or copy it.',
      downloadImage: 'Download image',
      copyImage: 'Copy image',
      generatingImage: 'Generating...',
      shareImageDownloaded: 'Image downloaded',
      shareImageCopied: 'Image copied',
      shareImageGenerateFailed: 'Failed to generate share image',
      shareImageCopyFailed: 'Failed to copy image',
      sharePreviewMissing: 'Share image preview is missing',
      shareContentTruncated: 'Content truncated at 2000 characters.',
      shareIncludeAnnotations: 'Include annotations',
      shareNoAnnotations: 'No annotations for this prompt',
      annotations: 'Annotations',
      noAnnotations: 'No annotations yet',
      annotationText: 'Annotation text',
      annotationPlaceholder: 'Record how this prompt worked...',
      saveAnnotation: 'Save annotation',
      savingAnnotation: 'Saving...',
      addImage: 'Add image',
      removeImage: 'Remove image',
      editAnnotation: 'Edit annotation',
      deleteAnnotation: 'Delete annotation',
      annotationDeleteConfirm: 'Delete this annotation?',
      annotationLoadFailed: 'Failed to read annotations',
      annotationSaveFailed: 'Failed to save annotation',
      annotationImageTooLarge: 'Image must be 5MB or smaller',
      annotationImageOnly: 'Only image attachments are supported',
      annotationImageSelected: (name: string) => `Selected ${name}`,
      annotationCreatedAt: (time: string) => `Created ${time}`,
      annotationUpdatedAt: (time: string) => `Edited ${time}`,
      annotationImageAlt: (name: string) => `Annotation image ${name}`,
      openAnnotationImage: 'Open image preview',
      closeAnnotationImage: 'Close image preview',
      expandAnnotation: 'Expand',
      collapseAnnotation: 'Collapse',
      commandNewPrompt: 'New prompt',
      commandSearchPrompts: 'Search prompts',
      commandInputPlaceholder: 'Type a command or search...',
      commandNoMatches: 'No matching commands',
      commandActionGroup: 'Actions',
      commandTitleGroup: 'Titles',
      commandRecentGroup: 'Recently used',
      commandSearchGroup: 'Search',
      fullTextSearch: (query: string) => `Full-text search "${query}"`,
      navigate: 'Navigate',
      selectCommand: 'Select',
      closeCommand: 'Close',
      welcomeBadgeOne: 'Manage faster',
      welcomeBadgeTwo: 'Organize clearly',
      welcomeBadgeThree: 'Reuse anytime',
      welcomeSubtitle: 'Your personal prompt manager',
      welcomeDescription:
        'Organize ideas and prompts in one place with structure and fast search.',
      unsupportedBrowserTitle: 'This browser is not supported',
      unsupportedBrowserDescription:
        'Local file read/write requires Chrome or Edge 86+.',
      chooseDataDirectory: 'Choose data folder',
      localOnlyNote: 'All data stays on this device and is never uploaded to a server.',
      downloadClientDivider: 'Or download the apps',
      downloadIOS: 'iOS App',
      downloadDesktop: 'Desktop',
      featureLocalTitle: 'Local First',
      featureLocalDescription: ['Data is stored locally, private, secure, and yours alone.'],
      featureFastTitle: 'File over app',
      featureFastDescription: ['Store data in fully open Markdown files and migrate freely.'],
      featureMarkdownTitle: 'Multi-platform apps',
      featureMarkdownDescription: ['Web App, iOS (iPhone/iOS), Windows, Mac.'],
    },
    settings: {
      title: 'Settings',
      generalTab: 'General',
      backupTab: 'Backup',
      backupTitle: 'Backup',
      backupDescription: 'Incrementally mirror the complete workspace to a dedicated WebDAV folder.',
      backupDesktopOnly: 'Backup is available in the desktop app only.',
      backupName: 'Target name',
      backupUrl: 'WebDAV URL (HTTPS)',
      backupUsername: 'Username',
      backupPassword: 'Password',
      backupPasswordPlaceholder: 'Leave blank to use the password in the system keychain',
      backupRemotePath: 'Dedicated remote folder',
      backupTestConnection: 'Test connection',
      backupTesting: 'Testing connection…',
      backupInProgress: 'Backing up. Keep the app open…',
      restoreInProgress: 'Restoring. Keep the app open…',
      backupConnectionSucceeded: 'Connection successful',
      backupRemoteDirectoryNotFound:
        'Check that the path is correct and the dedicated remote folder has been created.',
      backupNow: 'Back up now',
      backupRestore: 'Restore workspace',
      backupNoWorkspace: 'Select a local workspace first',
      backupCancelled: 'Cancelled',
      restoreConfigConflictTitle: 'Restore workspace configuration',
      restoreConfigConflict:
        'promptclip.config.json already exists in this folder. Overwrite it with the backup?',
      restoreConfigOverwrite: 'Overwrite',
      restoreConfigSkip: 'Skip',
      backupSucceeded: (uploaded: number, deleted: number) =>
        `Backup complete: ${uploaded} uploaded, ${deleted} deleted`,
      restoreSucceeded: (restored: number, unchanged: number, skipped: number) =>
        `Restore complete: ${restored} written, ${unchanged} unchanged skipped, ${skipped} preserved`,
      aboutTab: 'About',
      reset: 'Restore defaults',
      save: 'Save settings',
      saving: 'Saving...',
      saved: 'Settings saved',
      saveFailed: 'Failed to save settings',
      generalTitle: 'General settings',
      generalDescription: 'Manage PromptClip behavior and preferences.',
      languageTitle: 'Language',
      languageDescription: 'Change the display language used by PromptClip.',
      shareAuthorTitle: 'Share author',
      shareAuthorDescription:
        'Author name shown in the top-left corner of share images. Leave it empty to hide author info.',
      shareAuthorPlaceholder: 'Enter author name',
      chinese: 'Chinese',
      english: 'English',
      historyTitle: 'History versions',
      fileWatchingTitle: 'Watch file changes automatically',
      fileWatchingDescription:
        'Automatically update PromptClip when Markdown files are added, changed, or removed outside the app.',
      fileWatchingAriaLabel: 'Watch file changes automatically',
      fileWatchingNote:
        'The web app checks periodically and may have a short delay. When disabled, external changes are read after reopening the workspace.',
      analyticsTitle: 'Usage analytics',
      analyticsDescription:
        'Helps us understand feature usage. Only anonymous page views and feature counts are collected — never your prompt content. Web only.',
      analyticsAriaLabel: 'Usage analytics',
      analyticsNote:
        'Powered by Google Analytics 4 with IP anonymization. After disabling, no new events are sent; already-sent events cannot be recalled.',
      historyDescription:
        'Off by default. When enabled, future edits keep historical snapshots.',
      historyAriaLabel: 'Enable history versions',
      historyNote:
        'When disabled, history folders and snapshots are not created automatically. Retention days are saved for now and are not cleaned up automatically yet.',
      retentionDays: 'Retention days',
      days: (days: number) => `${days} days`,
      maintenanceTitle: 'Folder maintenance',
      metadataPromptTitle: 'Metadata issues found',
      metadataPromptDescription: (count: number) =>
        `${count} Markdown files have missing or invalid PromptClip metadata.`,
      metadataPromptIgnore: 'Ignore this time',
      metadataPromptView: 'View details',
      metadataPromptRepair: 'Repair automatically',
      maintenanceDescription:
        'Scan Markdown created by Obsidian and fill in PromptClip frontmatter.',
      scanMetadata: 'Scan metadata',
      scanningMetadata: 'Scanning...',
      scanFailed: 'Failed to scan metadata',
      scanEmpty:
        'After scanning, missing or invalid PromptClip metadata is listed. Files are not changed immediately.',
      scanHealthy: (count: number) =>
        `Scanned ${count} Markdown files. Nothing needs to be filled in.`,
      scanRepairable: (total: number, repairable: number) =>
        `Scanned ${total} Markdown files. ${repairable} files need metadata.`,
      missingFields: 'Missing',
      invalidFields: 'Invalid',
      hiddenIssues: (count: number, limit: number) =>
        `${count} more files are hidden. The list shows the first ${limit} files at most.`,
      repairMetadata: 'Fill missing metadata',
      repairingMetadata: 'Filling...',
      repairConfirm: (count: number) =>
        `Fill missing metadata for ${count} files? Existing fields and content will be preserved.`,
      repairSucceeded: (count: number) => `Filled metadata for ${count} files`,
      repairFailed: 'Failed to fill metadata',
      emptyField: 'None',
      aboutTitle: 'PromptClip',
      aboutDescription: 'A personal Prompt workspace built for the AI era',
      aboutIntroParagraphs: [
        'AI conversations can disappear into the stream at any moment. The Prompts, thinking, and workflows that matter should not disappear with them.',
        'PromptClip lets these materials keep growing in your file system: quick to capture, easy to search, ready to reuse, and able to evolve over time.',
      ],
      aboutFileTitle: 'File over app',
      aboutFileParagraphs: [
        'PromptClip stores content as fully open Markdown files.',
        'You can open and edit them with any editor, and back them up, sync them, migrate them, or version them like ordinary files.',
        'It works naturally with Markdown note tools such as Obsidian and does not lock your data inside any closed platform.',
      ],
      aboutLocalTitle: 'Local First',
      aboutLocalParagraphs: [
        'All files stay directly on your own device.',
        'No cloud database, no account system, and no binding to any online platform.',
        'Your data belongs entirely to you.',
      ],
      aboutCommitment:
        'This is a commitment to self-preservation: tools may disappear, but your data remains yours.',
      quickSearch: {
        title: 'Quick Search',
        description:
          'Summon the search overlay from any app with a global shortcut, then paste at the cursor or open the prompt in the main window.',
        enabledLabel: 'Enable global search overlay',
        enabledDescription:
          'When disabled, PromptClip will not register a global shortcut or summon the overlay from other apps.',
        shortcutLabel: 'Summon shortcut',
        shortcutRecord: 'Click to record',
        shortcutRecording: 'Press a key combination…',
        shortcutReset: 'Reset to default',
        shortcutUpdateFailed: 'Shortcut is invalid or already in use',
        macPermissionLabel: 'macOS Accessibility permission',
        macPermissionGranted: 'Granted',
        macPermissionOpen: 'Open System Settings',
        macPermissionHint:
          'Auto-paste requires Accessibility permission. Return to PromptClip after granting access; the status will update automatically.',
        placeholder: 'Search prompts…',
        noResults: 'No matches',
        resultsLabel: 'Search results',
        paste: 'Paste',
        openDetail: 'Open details in the main app',
      },
    },
    skills: {
      title: 'Skills',
      hubSkillCount: (count: number) =>
        `${count} ${count === 1 ? 'Skill' : 'Skills'} managed`,
      managePrompts: 'Manage Prompts',
      manageSkills: 'Manage Skills',
      searchPlaceholder: 'Search Skills by name',
      all: 'All',
      favorites: 'Favorites',
      clearFilter: 'Clear filter',
      agents: 'Agents',
      noAgents: 'No installed agents detected',
      moreTools: 'More tools',
      refresh: 'Scan',
      refreshHint: 'Scan existing Skills on local Agents and import them',
      create: 'New',
      upload: 'Upload',
      settings: 'Sync settings',
      loading: 'Loading Skills…',
      noSkills: 'No Skills yet',
      noSkillsHint: 'Scan, create, or upload Skills to start managing Agent Skills.',
      noMatchingSkills: 'No matching Skills',
      noMatchingSkillsHint: 'Try adjusting your search query or clearing the active filter.',
      favorite: 'Favorite Skill',
      unfavorite: 'Remove Skill from favorites',
      enableFor: (tool: string) => `Enable for ${tool}`,
      disableFor: (tool: string) => `Disable for ${tool}`,
      resyncFor: (tool: string) => `Resync for ${tool}`,
      repairBrokenFor: (tool: string) => `Repair broken link for ${tool}`,
      repairBroken: 'Repair link',
      confirmRepairBroken: (skill: string, tool: string, path: string) =>
        `Repair the broken link for “${skill}” in ${tool}?\n\nTarget: ${path}\n\nPromptClip will replace the broken link and recreate the managed target.`,
      forceOverwriteFor: (tool: string) => `Force overwrite for ${tool}`,
      forceOverwrite: 'Force overwrite',
      confirmForceOverwrite: (skill: string, tool: string, path: string) =>
        `Force overwrite “${skill}” for ${tool}?\n\nTarget: ${path}\n\nPromptClip will replace the existing same-name file, directory, or link. This cannot be undone after it succeeds.`,
      fromAgentsSkills: 'From Agents Skills',
      alsoInAgentsSkills: 'Also in Agents Skills',
      fromAgentsSkillsTooltip: (tool: string) =>
        `Active for ${tool} via shared Agents Skills (~/.agents/skills)`,
      alsoInAgentsSkillsTooltip: (tool: string) =>
        `Enabled in both ${tool}'s dedicated directory and shared Agents Skills (~/.agents/skills)`,
      duplicateSharedEnableTitle: (tool: string) => `Enable for ${tool} anyway?`,
      enableAnyway: 'Enable anyway',
      confirmDuplicateSharedEnable: (skill: string, tool: string) =>
        `“${skill}” is already active for ${tool} via Agents Skills (~/.agents/skills).\n\nEnabling it here will sync an extra copy to ${tool}'s dedicated directory. To avoid duplicates, you can keep using Agents Skills. Continue anyway?`,
      agentCountTooltipWithShared: (tool: string, total: number, shared: number) =>
        `${tool} (${total} total, ${shared} via Agents Skills)`,
      pendingFor: (tool: string) => `Syncing ${tool}`,
      statusEnabled: 'Enabled',
      statusDisabled: 'Disabled',
      statusStale: 'Needs sync',
      statusBroken: 'Broken link',
      statusConflict: 'Conflict',
      quickSwitch: 'Quick switch',
      scanExternal: 'Check Agent tools for new Skills',
      export: 'Export ZIP',
      importTitle: 'Import Agent Skills',
      importSummary: (total: number, existing: number, added: number) =>
        `Found ${total} skills: ${existing} already in PromptClip, ${added} new`,
      existingSkills: 'Existing',
      newSkills: 'New',
      keepHub: 'Keep PromptClip version',
      useExternal: 'Use this external version',
      skipImport: 'Skip',
      confirmImport: 'Confirm import',
      importing: 'Importing…',
      importingProgress: (current: number, total: number) => `Importing (${current}/${total})…`,
      importingProgressDetail: (skill: string, current: number, total: number) =>
        `Importing ${skill} (${current}/${total})`,
      close: 'Close',
      sourceCount: (count: number) => `${count} sources`,
      invalidExternalEntries: (count: number) =>
        `${count} external ${count === 1 ? 'Skill' : 'Skills'} could not be scanned`,
      invalidBrokenLinkCountBadge: (count: number) =>
        `${count} broken ${count === 1 ? 'link' : 'links'} can be cleaned up`,
      invalidGroupTitle: (code: string) => {
        switch (code) {
          case 'skill_external_link_invalid':
            return 'Broken symbolic links';
          case 'skill_markdown_invalid_type':
            return 'Symlinked entry files';
          case 'skill_content_symlink':
            return 'Contains internal symbolic links';
          case 'invalid_skill_id':
            return 'Invalid directory names';
          case 'skill_name_mismatch':
            return 'Name does not match directory';
          case 'skill_markdown_missing':
            return 'Missing SKILL.md entry file';
          default:
            return 'Other unscannable entries';
        }
      },
      invalidGroupHint: (code: string) => {
        switch (code) {
          case 'skill_external_link_invalid':
            return 'These symbolic links point to missing targets or non-directories and can be safely removed.';
          case 'skill_markdown_invalid_type':
            return 'SKILL.md is a symbolic link (common for sub-skills generated by plugin suites). Keep managed by the original tool instead of importing.';
          case 'skill_content_symlink':
            return 'Contains internal symbolic links (common for bundled plugin repos with node_modules). Skipped to avoid breaking its runtime; keep managed by the original tool.';
          default:
            return null;
        }
      },
      cleanupBrokenLink: 'Clean up link',
      cleanupAllBrokenLinks: 'Clean up all',
      cleaningBrokenLinks: 'Cleaning up…',
      confirmCleanupBrokenLinkTitle: 'Clean up broken symbolic link',
      confirmCleanupBrokenLink: (name: string, path: string) =>
        `Remove the broken symbolic link “${name}”?\n\nPath: ${path}\n\nOnly the dangling symbolic link itself will be removed. No regular folders will be deleted.`,
      confirmCleanupAllBrokenLinks: (count: number) =>
        `Remove all ${count} broken symbolic links?\n\nOnly the dangling symbolic links themselves will be removed. No regular folders will be deleted.`,
      cleanupBrokenLinksSuccess: (count: number) =>
        `Cleaned up ${count} broken symbolic ${count === 1 ? 'link' : 'links'}`,
      skillScanError: (code: string, params: Record<string, string>) => {
        switch (code) {
          case 'invalid_skill_id':
            return `The directory name "${params.skillId ?? ''}" is not a valid skill id (letters, digits, -, _, ., @, : only; cannot start or end with .; max 128 chars).`;
          case 'skill_name_mismatch':
            return `The frontmatter name "${params.metadataName ?? ''}" does not match the directory name "${params.directoryName ?? ''}".`;
          case 'skill_markdown_missing':
            return 'Missing the skill entry file (SKILL.md).';
          case 'skill_markdown_invalid_type':
            return 'The skill entry file must be a regular file, not a link.';
          case 'skill_source_invalid':
            return 'The skill directory is neither a folder nor a valid link.';
          case 'skill_external_link_invalid':
            return 'The symbolic link is broken or does not point to a directory.';
          case 'skill_frontmatter_missing':
            return 'The skill file is missing its YAML frontmatter (must start with "---").';
          case 'skill_frontmatter_unclosed':
            return 'The YAML frontmatter is not closed (missing a closing "---").';
          case 'skill_frontmatter_invalid':
            return 'The YAML frontmatter could not be parsed (must contain name and description).';
          case 'skill_description_empty':
            return 'The skill description is empty.';
          case 'skill_content_symlink':
            return `The skill contains an internal symbolic link ("${params.path ?? ''}"), typically a bundled plugin repo; keep it managed by its original tool.`;
          case 'skill_content_special_file':
            return `The skill contains an unsupported special file ("${params.path ?? ''}").`;
          case 'skill_io_error':
            return `A file system error occurred during ${params.operation ?? ''}: ${params.message ?? ''}`;
          case 'skill_path_outside_root':
            return 'The skill directory structure is invalid.';
          default:
            return 'This skill could not be scanned. Please check its directory structure.';
        }
      },
      revealExternalPath: (path: string) => `Show ${path} in file manager`,
      createTitle: 'Create Skill',
      skillName: 'Skill name',
      skillNameHint: 'Use lowercase letters, numbers, and single hyphens, up to 64 characters.',
      skillDescription: 'Skill description',
      cancel: 'Cancel',
      confirmCreate: 'Create and open',
      archiveTitle: 'Upload Skill archive',
      archiveConflict: 'A Skill with this name already exists. Choose which version to keep.',
      confirmArchiveImport: 'Import',
      backToSkills: 'Back to Skills',
      revealSkillFolder: 'Show Skill folder in file manager',
      newFolder: 'New folder',
      newFile: 'New text file',
      uploadFile: 'Upload file',
      rename: 'Rename',
      delete: 'Delete',
      deleteSkill: 'Delete Skill',
      deleteSkillTitle: 'Delete Skill',
      deleteSkillConfirm: (skill: string) => `Delete “${skill}”?`,
      deleteSkillNote:
        'This permanently deletes the Skill from PromptClip and cannot be undone.',
      deleteManagedSkillNote:
        'This Skill is used by Agent tools. Delete every managed copy, or keep the Agent Skills; symbolic links will become independent copies.',
      deleteEverywhere: 'Delete everywhere',
      deletePromptClipOnly: 'Delete only from PromptClip',
      download: 'Download',
      save: 'Save',
      edit: 'Edit',
      preview: 'Preview',
      binaryNoPreview: 'This file cannot be previewed here. Download it to open in another app.',
      selectFile: 'Select a file from the tree',
      unsavedChanges: 'Discard unsaved changes?',
      syncPartialFailure: 'Saved, but some copy targets could not be refreshed.',
      operationFailed: 'The operation failed. Please try again.',
      scanNoExternalFound: 'Scan complete. No external Skills found to import.',
      skillOperationError: (code: string, params: Record<string, string>) => {
        switch (code) {
          case 'skill_already_exists':
            return 'A Skill with this name already exists. Please choose another name.';
          case 'skill_symlink_permission_denied':
            return 'Permission denied while creating a symbolic link. On Windows, enable Developer Mode or switch to File Copy in sync settings.';
          case 'skill_file_conflict':
            return 'The file was modified outside PromptClip. Reload it before saving to avoid overwriting changes.';
          case 'skill_file_too_large':
            return 'The file exceeds the maximum allowed size.';
          case 'skill_file_not_text':
            return 'This file type cannot be edited as text in PromptClip.';
          case 'skill_file_not_utf8':
            return 'This file is not valid UTF-8 text and cannot be edited here.';
          case 'skill_entry_exists':
            return 'A file or folder with the same name already exists here.';
          case 'skill_entry_protected':
            return 'SKILL.md is protected and cannot be renamed or deleted.';
          case 'skill_archive_multiple_roots':
            return 'The archive contains multiple top-level folders. Only one Skill per archive is supported.';
          case 'skill_archive_too_large':
            return 'The archive exceeds the 50 MiB limit.';
          case 'skill_archive_expanded_too_large':
            return 'The extracted archive exceeds the 200 MiB limit.';
          case 'skill_archive_too_many_entries':
            return 'The archive exceeds the 5,000-entry limit.';
          case 'skill_archive_unsafe_path':
          case 'skill_archive_special_entry':
            return 'The archive contains unsafe paths or unsupported link entries.';
          case 'skill_archive_extension_invalid':
            return 'Only .zip and .skill archive files are supported.';
          case 'skill_archive_invalid':
            return 'The archive is invalid or corrupted.';
          case 'skill_target_conflict':
            return 'An unmanaged item with the same name exists in the Agent directory. Click the tool icon to resolve the conflict.';
          case 'skill_target_group_mode_conflict':
            return 'Tools sharing the same skills directory have conflicting sync modes. Align them in settings first.';
          case 'skill_custom_tool_name_required':
            return 'Please enter a name for the custom tool.';
          case 'skill_custom_tool_path_required':
            return 'Please enter the skills directory path for the custom tool.';
          case 'skill_custom_tool_path_not_absolute':
          case 'skill_custom_tool_path_invalid':
            return 'The custom tool skills directory must be a valid absolute path.';
          case 'skill_custom_tool_duplicate':
            return 'A custom tool with the same name or path already exists.';
          case 'skill_category_name_required':
            return 'Category name is required.';
          case 'skill_category_name_too_long':
            return 'Category name is too long.';
          case 'skill_category_name_duplicate':
            return 'Category name already exists.';
          case 'skill_category_name_reserved':
            return 'This name is reserved. Please choose another.';
          case 'skill_source_changed':
            return 'The external Skill changed on disk. Rescan before importing.';
          case 'skill_io_error':
            return params.message
              ? `File system error: ${params.message}`
              : 'A file system error occurred. Please check permissions and retry.';
          default:
            return params.message
              ? `Operation failed: ${params.message}`
              : 'The operation failed. Please try again.';
        }
      },
      invalidSkillName: 'The Skill name is invalid.',
      exportSuccess: 'Skill exported.',
      protected: 'Protected',
      defaultSyncMode: 'Default sync mode',
      inheritMode: 'Use global default',
      symlinkMode: 'Symbolic link',
      copyMode: 'File copy',
      settingsTitle: 'Settings',
      syncTab: 'Sync settings',
      syncDescription: 'Configure how Skills are written to agent tools.',
      storageTab: 'Storage',
      storageDescription: 'PromptClip stores all Skills in a local folder.',
      storagePath: 'Location',
      storageOpen: 'Open in file manager',
      storageDesktopOnly: 'Storage is available only in the desktop version.',
      storageOpenFailed: 'Failed to open. Please try again.',
      saveSettings: 'Save settings',
      migrationHint: 'Enabled Skills will migrate to the new mode after saving. Failed items can be retried.',
      agentNotInstalled: 'Not installed',
      uninstalledAgents: (count: number) => `Not installed (${count})`,
      enableAgent: (tool: string) => `Enable ${tool}`,
      disableAgent: (tool: string) => `Disable ${tool}`,
      agentDisabledHint: 'Disabled agents are hidden from skill cards and the sidebar, and do not participate in syncing.',
      customTools: 'Custom tools',
      customToolHint: 'Add an agent tool that is not built in: provide its name and the directory where it reads skills.',
      customToolName: 'Tool name',
      customToolNamePlaceholder: 'e.g. MyAgent',
      customToolPath: 'Skills directory path',
      customToolPathPlaceholder: 'Absolute path of the directory where the agent reads skills',
      customToolSelectPath: 'Select folder',
      customToolAdd: 'Add',
      customToolRemove: 'Remove custom tool',
      dragHandle: 'Drag to reorder',
      dragHint: 'Drag the handle to reorder agents; skill cards and the sidebar update in sync.',
      // Skill editor: file operation dialogs / context menu
      newFolderTitle: 'New folder',
      newFileTitle: 'New text file',
      renameTitle: 'Rename',
      folderName: 'Folder name',
      fileName: 'File name',
      namePlaceholder: 'Enter a name',
      confirm: 'Confirm',
      deleteEntryConfirm: (name: string) => `Delete "${name}"?`,
      deleteEntryNote: 'This action cannot be undone.',
      dropHint: 'Drop files here to import',
      dropFolderUnsupported: 'Folders are not supported. Please drop files only.',
      dropConflictSkipped: (count: number) =>
        `${count} file(s) skipped because a file with the same name already exists.`,
      dropMoveIntoSelf: 'Cannot move an item into itself or one of its own subfolders.',
      dropConflictMove: (name: string) =>
        `A file named "${name}" already exists at the destination. Move failed.`,
      categories: 'Categories',
      defaultCategory: 'Default',
      addCategory: 'New category',
      categoryName: 'Category name',
      categoryNamePlaceholder: 'Enter a category name',
      renameCategory: 'Rename category',
      deleteCategory: 'Delete category',
      deleteCategoryConfirm: (name: string) => `Delete the category "${name}"?`,
      deleteCategoryNote:
        'Skills in this category will return to "Default"; they will not be deleted.',
      addToCategory: 'Add to category',
      newCategory: 'New category',
      selectAll: 'Select all',
      deselectAll: 'Deselect all',
      noSkillsInCategory: 'No Skills in this category yet',
      noCategoriesYet: 'No categories yet',
      quickCreateCategoryPlaceholder: 'New category name',
      categoryNameRequired: 'Category name is required',
      categoryNameTooLong: 'Category name is too long',
      categoryNameDuplicate: 'Category name already exists',
      categoryNameReserved: 'This name is reserved, please choose another',
    },
    metadataFields: {
      id: 'ID',
      title: 'Title',
      tags: 'Tags',
      created: 'Created time',
      modified: 'Modified time',
      copy_count: 'Copy count',
      pinned: 'Favorite state',
    } satisfies Record<PromptMetadataField, string>,
    recycle: {
      title: 'Recycle Bin',
      commandOpen: 'Open Recycle Bin',
      empty: 'Recycle bin is empty',
      emptyAll: 'Empty All',
      view: 'View',
      restore: 'Restore',
      permanentDelete: 'Delete Permanently',
      closeDetail: 'Close details',
      hasAnnotationsBadge: 'Has annotations',
      loading: 'Loading...',
      permanentlyDeleted: 'Permanently deleted',
      allCleared: 'Recycle bin emptied',
      restoreSuffix: (counter: number) => `-restored-${counter}`,
      deletedAt: (date: string) => `Deleted ${date}`,
      confirmRestore: (title: string) => `Restore "${title}"?`,
      confirmPermanentDelete: (title: string) =>
        `Permanently delete "${title}"? This cannot be undone.`,
      confirmEmptyAll:
        'Empty the recycle bin? All files will be permanently deleted.',
      restored: (title: string) => `Restored "${title}"`,
      restoreFailed: 'Restore failed, please retry',
      deleteFailed: 'Delete failed, please retry',
      emptyFailed: 'Some operations failed, please retry',
    },
    markdownEditor: {
      slashMenuLabel: 'Slash insert commands',
      slashMenuClose: 'Close slash menu',
      toolbarLabel: 'Markdown formatting toolbar',
      toolbar: {
        h1: 'Heading 1',
        h2: 'Heading 2',
        h3: 'Heading 3',
        bold: 'Bold',
        italic: 'Italic',
        inlineCode: 'Inline code',
        link: 'Link',
        ul: 'Bullet list',
        ol: 'Numbered list',
        quote: 'Quote',
        codeBlock: 'Code block',
        task: 'Task list',
      },
      slash: {
        h1: 'Heading 1',
        h2: 'Heading 2',
        h3: 'Heading 3',
        bold: 'Bold',
        italic: 'Italic',
        inlineCode: 'Inline code',
        link: 'Link',
        ul: 'Bullet list',
        ol: 'Numbered list',
        quote: 'Quote',
        codeBlock: 'Code block',
        task: 'Task list',
        noMatch: 'No matching command',
      },
    },
  },
  'ja-JP': {
    common: {
      cancel: 'キャンセル',
    },
    app: {
      prompts: 'Prompts',
      skills: 'Skills',
      noWorkspace: 'フォルダが選択されていません',
      tags: 'タグ',
      pinnedTags: '固定タグ',
      allTags: 'すべてのタグ',
      noTags: 'タグはありません',
      localStorage: 'データはローカルに保存されます',
      expandStorage: 'データフォルダ情報を展開',
      collapseStorage: 'データフォルダ情報を折りたたむ',
      openSettings: '設定を開く',
      collapseSidebar: 'サイドバーを折りたたむ',
      expandSidebar: 'サイドバーを展開',
      switchFolder: 'フォルダを切り替え',
      searchPlaceholder: 'クイック検索',
      quickSwitch: 'クイック切り替え',
      quickSwitchAria: (shortcut: string) => `クイック切り替え ${shortcut}`,
      clearSearch: '検索をクリア',
      searchResultCount: (count: number) => `${count} 件の結果が見つかりました`,
      exportPrompts: 'Prompts をエクスポート',
      createPrompt: '新規 Prompt (Cmd+N)',
      all: 'すべて',
      recent: '最近',
      favorites: 'お気に入り',
      select: '選択',
      deselect: '選択解除',
      favorite: 'お気に入り',
      unfavorite: 'お気に入り解除',
      moreActions: 'その他の操作',
      edit: '編集',
      delete: '削除',
      sharePrompt: '共有',
      copyPromptContent: 'Prompt 内容をコピー',
      copy: 'コピー',
      copied: 'コピー済み',
      tagActions: 'タグ操作',
      pin: '固定',
      unpin: '固定解除',
      rename: '名前を変更',
      deleteTag: 'タグを削除',
      renameTagPrompt: '新しいタグパスを入力',
      removeTagConfirm: (tag: string) => `関連する Prompt からタグ #${tag} を削除しますか？`,
      detailPanel: '詳細パネル',
      noPromptSelected: 'Prompt が選択されていません',
      close: '閉じる',
      resizeDrawer: 'ドロワー幅を調整',
      dragResize: 'ドラッグして幅を調整',
      characterCount: (count: number) => `${count} 文字`,
      usageCount: (count: number) => `${count} 回使用`,
      favorited: 'お気に入り済み',
      notFavorited: 'お気に入り未登録',
      noAnnotationSummary: '注釈なし',
      annotationSummary: (count: number) => `${count} 件の注釈`,
      viewHistory: '履歴バージョンを表示',
      historyVersions: '履歴バージョン',
      content: '内容',
      sourceMode: 'ソースモード',
      liveMode: 'Live Preview',
      previewMode: 'プレビューモード',
      toggleMarkdownMode: 'Markdown 表示モードを切り替え',
      editPrompt: 'Prompt を編集',
      doubleClickToEdit: 'ダブルクリックで編集',
      createPromptTitle: '新規 Prompt',
      title: 'タイトル',
      titlePlaceholder: 'Prompt タイトルを入力...',
      add: '追加',
      tagNamePlaceholder: 'タグ名',
      removeTag: 'タグを削除',
      removeTagAria: (tag: string) => `タグ ${tag} を削除`,
      contentPlaceholder: 'Prompt 内容を入力...',
      promptContent: 'Prompt 内容',
      enterTitle: 'タイトルを入力してください',
      enterContent: '内容を入力してください',
      saving: '保存中...',
      save: '保存',
      create: '作成',
      fullscreenEdit: '全画面編集',
      exitFullscreen: '全画面を終了',
      loading: '読み込み中...',
      noContent: '内容はありません',
      renderFailed: 'レンダリングに失敗しました',
      loadPromptsFailed: 'Prompts の読み込みに失敗しました',
      permissionDenied: 'フォルダへのアクセスが許可されていません',
      openDirectoryFailed: 'フォルダを開けませんでした',
      workspacePermissionExpired:
        'フォルダへのアクセス権限が期限切れです。データフォルダを再選択してください。',
      noPromptsFound: 'Prompts が見つかりません',
      emptyPromptHint: '検索条件を調整するか、新しい Prompt を作成してください',
      batchDeleteConfirm: (count: number) =>
        `${count} 個の Prompt を .trash に移動しますか？`,
      selectedCount: (count: number) => `${count} 個選択中`,
      toggleSelectAll: 'すべて選択/選択解除',
      clear: 'クリア',
      confirmDelete: '削除を確認',
      deletePromptConfirm: (title: string) => `Prompt ${title} を削除しますか？`,
      deletePromptNote:
        'この操作はファイルを .trash フォルダへ移動し、現在のリストから削除します。',
      historyLoadFailed: '履歴バージョンの読み込みに失敗しました',
      historyCopyFailed: '履歴バージョンのコピーに失敗しました',
      historyRestoreFailed: '履歴バージョンの復元に失敗しました',
      restore: '復元',
      restoring: '復元中...',
      selectHistoryVersion: '履歴バージョンを選択してください',
      noHistoryVersions: '履歴バージョンはありません',
      exportTitle: 'Prompts をエクスポート',
      noExportablePrompts: 'エクスポートできる Prompt はありません',
      exportFailed: 'エクスポートに失敗しました',
      exportScope: 'エクスポート範囲',
      selectedScope: (count: number) => `選択中 ${count}`,
      filteredScope: (count: number) => `現在の絞り込み ${count}`,
      allScope: (count: number) => `すべて ${count}`,
      exportFormat: 'エクスポート形式',
      exportCount: (count: number) => `${count} 個の Prompt をエクスポートします`,
      exporting: 'エクスポート中...',
      export: 'エクスポート',
      shareImageTitle: '共有画像を生成',
      shareTemplate: 'カードテンプレート',
      shareOptions: '共有オプション',
      showAuthorInfo: '作者情報を表示',
      showPromptClipLogo: 'PromptClip ロゴを表示',
      showPromptTags: 'ノート内のタグを表示',
      renderMarkdown: 'Markdown をレンダリング',
      shareRightClickHint: 'プレビュー画像を右クリックして保存またはコピーできます',
      downloadImage: '画像をダウンロード',
      copyImage: '画像をコピー',
      generatingImage: '生成中...',
      shareImageDownloaded: '画像をダウンロードしました',
      shareImageCopied: '画像をコピーしました',
      shareImageGenerateFailed: '共有画像の生成に失敗しました',
      shareImageCopyFailed: '画像のコピーに失敗しました',
      sharePreviewMissing: '共有画像のプレビュー領域が見つかりません',
      shareContentTruncated: '内容は 2000 文字までに切り詰められました。',
      shareIncludeAnnotations: '注釈を含める',
      shareNoAnnotations: 'この Prompt には注釈がありません',
      annotations: '注釈',
      noAnnotations: '注釈はありません',
      annotationText: '注釈内容',
      annotationPlaceholder: 'この Prompt の使用結果を記録...',
      saveAnnotation: '注釈を保存',
      savingAnnotation: '保存中...',
      addImage: '画像を追加',
      removeImage: '画像を削除',
      editAnnotation: '注釈を編集',
      deleteAnnotation: '注釈を削除',
      annotationDeleteConfirm: 'この注釈を削除しますか？',
      annotationLoadFailed: '注釈の読み込みに失敗しました',
      annotationSaveFailed: '注釈の保存に失敗しました',
      annotationImageTooLarge: '画像は 5MB 以下にしてください',
      annotationImageOnly: '画像添付のみ対応しています',
      annotationImageSelected: (name: string) => `${name} を選択しました`,
      annotationCreatedAt: (time: string) => `${time} に作成`,
      annotationUpdatedAt: (time: string) => `${time} に編集`,
      annotationImageAlt: (name: string) => `注釈画像 ${name}`,
      openAnnotationImage: '画像プレビューを拡大表示',
      closeAnnotationImage: '画像プレビューを閉じる',
      expandAnnotation: '展開',
      collapseAnnotation: '折りたたむ',
      commandNewPrompt: '新規 Prompt',
      commandSearchPrompts: 'Prompts を検索',
      commandInputPlaceholder: 'コマンドまたは検索語を入力...',
      commandNoMatches: '一致するコマンドはありません',
      commandActionGroup: '操作',
      commandTitleGroup: 'タイトル',
      commandRecentGroup: '最近使用',
      commandSearchGroup: '検索',
      fullTextSearch: (query: string) => `全文検索「${query}」`,
      navigate: '移動',
      selectCommand: '選択',
      closeCommand: '閉じる',
      welcomeBadgeOne: '効率的に管理',
      welcomeBadgeTwo: 'スマートに整理',
      welcomeBadgeThree: 'いつでも再利用',
      welcomeSubtitle: 'あなた専用の Prompt 管理ツール',
      welcomeDescription:
        'ひらめきとプロンプトを一元管理し、構造化してすばやく検索できます。',
      unsupportedBrowserTitle: '現在のブラウザは対応していません',
      unsupportedBrowserDescription:
        'ローカルファイルの読み書きには Chrome または Edge 86+ が必要です。',
      chooseDataDirectory: 'データフォルダを選択',
      localOnlyNote: 'すべてのデータはローカルにのみ保存され、サーバーにはアップロードされません',
      downloadClientDivider: 'またはアプリをダウンロード',
      downloadIOS: 'iOS App',
      downloadDesktop: 'デスクトップ版',
      featureLocalTitle: 'Local First',
      featureLocalDescription: ['データはローカルに保存され、プライバシーを守り、あなただけのものです。'],
      featureFastTitle: 'File over app',
      featureFastDescription: ['完全にオープンな Markdown ファイルでデータを保存し、自由に移行できます。'],
      featureMarkdownTitle: 'マルチプラットフォームAPP',
      featureMarkdownDescription: ['Web App、iOS（iPhone/iOS）、Windows、Mac。'],
    },
    settings: {
      title: '設定',
      generalTab: '一般',
      backupTab: 'バックアップ',
      backupTitle: 'バックアップ',
      backupDescription: 'ワークスペース全体を専用 WebDAV フォルダーへ増分バックアップします。',
      backupDesktopOnly: 'バックアップはデスクトップ版でのみ利用できます。',
      backupName: '保存先名',
      backupUrl: 'WebDAV URL（HTTPS）',
      backupUsername: 'ユーザー名',
      backupPassword: 'パスワード',
      backupPasswordPlaceholder: '空欄の場合はシステムキーチェーンのパスワードを使用',
      backupRemotePath: '専用リモートフォルダー',
      backupTestConnection: '接続テスト',
      backupTesting: '接続をテストしています…',
      backupInProgress: 'バックアップ中です。アプリを閉じないでください…',
      restoreInProgress: '復元中です。アプリを閉じないでください…',
      backupConnectionSucceeded: '接続に成功しました',
      backupRemoteDirectoryNotFound:
        'パスが正しく、専用リモートフォルダーが作成済みであることを確認してください。',
      backupNow: '今すぐバックアップ',
      backupRestore: 'ワークスペースを復元',
      backupNoWorkspace: '先にローカルワークスペースを選択してください',
      backupCancelled: 'キャンセルしました',
      restoreConfigConflictTitle: 'ワークスペース設定を復元',
      restoreConfigConflict:
        '選択したフォルダーに promptclip.config.json があります。バックアップで上書きしますか？',
      restoreConfigOverwrite: '上書き',
      restoreConfigSkip: 'スキップ',
      backupSucceeded: (uploaded: number, deleted: number) =>
        `バックアップ完了：${uploaded} 件アップロード、${deleted} 件削除`,
      restoreSucceeded: (restored: number, unchanged: number, skipped: number) =>
        `復元完了：${restored} 件を書き込み、変更なし ${unchanged} 件をスキップ、${skipped} 件を保持`,
      aboutTab: '概要',
      reset: 'デフォルト設定に戻す',
      save: '設定を保存',
      saving: '保存中...',
      saved: '設定を保存しました',
      saveFailed: '設定の保存に失敗しました',
      generalTitle: '一般設定',
      generalDescription: 'PromptClip の基本動作と環境設定を管理します',
      languageTitle: '言語',
      languageDescription: 'PromptClip の表示言語を切り替えます。',
      shareAuthorTitle: '共有作者',
      shareAuthorDescription:
        '共有画像の左上に表示する作者名です。空欄の場合、作者情報は表示されません。',
      shareAuthorPlaceholder: '作者名を入力',
      chinese: '中国語',
      english: '英語',
      historyTitle: '履歴バージョン',
      fileWatchingTitle: 'ファイル変更を自動監視',
      fileWatchingDescription:
        'ワークスペースの Markdown ファイルが外部で追加、変更、削除されたとき、PromptClip の画面を自動更新します。',
      fileWatchingAriaLabel: 'ファイル変更を自動監視',
      fileWatchingNote:
        'Web 版は定期チェックで実現するため、短い遅延が生じる場合があります。オフの場合、ワークスペースを開き直したときに外部変更を読み込みます。',
      analyticsTitle: '使用統計',
      analyticsDescription:
        '機能の利用状況把握に役立てます。ページビューと機能の利用回数のみ匿名で送信し、Prompt の内容は収集しません。Web 版のみ有効です。',
      analyticsAriaLabel: '使用統計',
      analyticsNote:
        'Google Analytics 4 を利用し、IP アドレスは匿名化されます。オフにすると以後の送信は行われませんが、送信済みのイベントは取り消せません。',
      historyDescription:
        'デフォルトではオフです。有効にすると、以後の編集時に履歴スナップショットを保持します。',
      historyAriaLabel: '履歴バージョンを有効にする',
      historyNote:
        'オフの場合、履歴フォルダとスナップショットは自動作成されません。保持日数は現在保存のみで、自動削除はまだ行いません。',
      retentionDays: '保持日数',
      days: (days: number) => `${days} 日`,
      maintenanceTitle: 'フォルダメンテナンス',
      metadataPromptTitle: 'メタデータの問題が見つかりました',
      metadataPromptDescription: (count: number) =>
        `${count} 個の Markdown ファイルに PromptClip メタデータの欠落または無効な値があります。`,
      metadataPromptIgnore: '今回は無視',
      metadataPromptView: '詳細を表示',
      metadataPromptRepair: '自動修復',
      maintenanceDescription:
        'Obsidian で作成した Markdown をスキャンし、PromptClip に必要な frontmatter を補完します。',
      scanMetadata: 'メタデータをスキャン',
      scanningMetadata: 'スキャン中...',
      scanFailed: 'メタデータのスキャンに失敗しました',
      scanEmpty:
        'スキャン後、欠落または無効な PromptClip メタデータを一覧表示します。ファイルはすぐには変更されません。',
      scanHealthy: (count: number) =>
        `${count} 個の Markdown ファイルをスキャンしました。補完は不要です。`,
      scanRepairable: (total: number, repairable: number) =>
        `${total} 個の Markdown ファイルをスキャンしました。${repairable} 個のファイルに補完が必要です。`,
      missingFields: '欠落',
      invalidFields: '無効',
      hiddenIssues: (count: number, limit: number) =>
        `さらに ${count} 個のファイルが非表示です。一覧は最大 ${limit} 個まで表示します。`,
      repairMetadata: '欠落メタデータを補完',
      repairingMetadata: '補完中...',
      repairConfirm: (count: number) =>
        `${count} 個のファイルの欠落メタデータを補完します。既存フィールドと本文は保持されます。続行しますか？`,
      repairSucceeded: (count: number) => `${count} 個のファイルを補完しました`,
      repairFailed: 'メタデータの補完に失敗しました',
      emptyField: 'なし',
      aboutTitle: 'PromptClip',
      aboutDescription: 'AI 時代のための個人 Prompt ワークスペース',
      aboutIntroParagraphs: [
        'AI との対話は情報の流れの中でいつでも消えてしまいます。しかし、本当に重要な Prompt、思考、ワークフローまで消えるべきではありません。',
        'PromptClip はそれらをあなたのファイルシステム上で育て続けます。すばやく記録し、簡単に検索し、繰り返し使い、長く進化させられます。',
      ],
      aboutFileTitle: 'File over app / アプリよりファイル',
      aboutFileParagraphs: [
        'PromptClip は内容を完全に開かれた Markdown ファイルとして保存します。',
        '任意のエディタで開いて編集でき、普通のファイルと同じようにバックアップ、同期、移行、バージョン管理ができます。',
        'Obsidian などの Markdown ノートツールと自然に連携し、データを閉じたプラットフォームに閉じ込めません。',
      ],
      aboutLocalTitle: 'Local First / ローカル優先',
      aboutLocalParagraphs: [
        'すべてのファイルはあなた自身の端末に直接残ります。',
        'クラウドデータベースもアカウントシステムも不要で、オンラインプラットフォームに縛られません。',
        'あなたのデータは完全にあなたのものです。',
      ],
      aboutCommitment:
        'これは自己防衛のための約束です。ツールは消えるかもしれませんが、データはあなたのものとして残ります。',
      quickSearch: {
        title: 'クイック検索',
        description:
          '任意のアプリでグローバルショートカットから検索パレットを呼び出し、カーソル位置に貼り付けるか、メインウィンドウで詳細を開けます。',
        enabledLabel: 'グローバル検索パレットを有効にする',
        enabledDescription:
          'オフにするとグローバルショートカットを登録せず、他のアプリから検索パレットを呼び出しません。',
        shortcutLabel: '呼び出しショートカット',
        shortcutRecord: 'クリックして登録',
        shortcutRecording: 'キーの組み合わせを押してください…',
        shortcutReset: 'デフォルトに戻す',
        shortcutUpdateFailed: 'ショートカットが無効か使用中です',
        macPermissionLabel: 'macOS アクセシビリティ権限',
        macPermissionGranted: '許可済み',
        macPermissionOpen: 'システム設定を開く',
        macPermissionHint:
          '自動貼り付けにはアクセシビリティ権限が必要です。許可後に PromptClip へ戻ると、状態が自動的に更新されます。',
        placeholder: 'Prompt を検索…',
        noResults: '一致する結果はありません',
        resultsLabel: '検索結果',
        paste: '貼り付け',
        openDetail: 'メインアプリで詳細を開く',
      },
    },
    skills: {
      title: 'Skills',
      hubSkillCount: (count: number) => `管理中の Skills ${count} 件`,
      managePrompts: 'Prompts を管理',
      manageSkills: 'Skills を管理',
      searchPlaceholder: '名前で Skills を検索',
      all: 'すべて',
      favorites: 'お気に入り',
      clearFilter: 'フィルターをクリア',
      agents: 'Agents',
      noAgents: 'インストールされた Agent が見つかりません',
      moreTools: 'その他',
      refresh: 'Skills をスキャン',
      refreshHint: 'ローカル Agents の既存 Skills をスキャンして取り込む',
      create: 'Skill を作成',
      upload: 'Skill をアップロード',
      settings: '同期設定',
      loading: 'Skills を読み込み中…',
      noSkills: 'Skills はまだありません',
      noSkillsHint: 'Skills をスキャン・作成・アップロードして Agent Skills を管理しましょう。',
      noMatchingSkills: '一致する Skills がありません',
      noMatchingSkillsHint: '検索キーワードを変更するか、別のフィルターに切り替えてみてください。',
      favorite: 'Skill をお気に入りに追加',
      unfavorite: 'Skill のお気に入りを解除',
      enableFor: (tool: string) => `${tool} で有効化`,
      disableFor: (tool: string) => `${tool} で無効化`,
      resyncFor: (tool: string) => `${tool} に再同期`,
      repairBrokenFor: (tool: string) => `${tool} のリンク切れを修復`,
      repairBroken: 'リンクを修復',
      confirmRepairBroken: (skill: string, tool: string, path: string) =>
        `${tool} の Skill「${skill}」の壊れたリンクを修復しますか？\n\n対象：${path}\n\nPromptClip が無効なリンクを置き換えて同期先を再作成します。`,
      forceOverwriteFor: (tool: string) => `${tool} の Skill を強制上書き`,
      forceOverwrite: '強制上書き',
      confirmForceOverwrite: (skill: string, tool: string, path: string) =>
        `${tool} の Skill「${skill}」を強制上書きしますか？\n\n対象：${path}\n\n同名の既存ファイル、フォルダー、またはリンクは PromptClip に置き換えられ、成功後は元に戻せません。`,
      fromAgentsSkills: 'Agents Skills から',
      alsoInAgentsSkills: 'Agents Skills でも有効',
      fromAgentsSkillsTooltip: (tool: string) =>
        `共有の Agents Skills（~/.agents/skills）経由で ${tool} に適用中`,
      alsoInAgentsSkillsTooltip: (tool: string) =>
        `${tool} 専用ディレクトリと共有 Agents Skills（~/.agents/skills）の両方で有効です`,
      duplicateSharedEnableTitle: (tool: string) => `${tool} でも重複して有効化しますか？`,
      enableAnyway: 'このまま有効化',
      confirmDuplicateSharedEnable: (skill: string, tool: string) =>
        `Skill「${skill}」は Agents Skills（~/.agents/skills）経由で ${tool} にすでに適用されています。\n\nここで有効化すると ${tool} 専用ディレクトリにも重複して同期されます。重複を避けるため Agents Skills のまま利用することをおすすめします。続行しますか？`,
      agentCountTooltipWithShared: (tool: string, total: number, shared: number) =>
        `${tool}（合計 ${total} 件、うち ${shared} 件は Agents Skills から）`,
      pendingFor: (tool: string) => `${tool} を同期中`,
      statusEnabled: '有効',
      statusDisabled: '無効',
      statusStale: '同期が必要',
      statusBroken: 'リンク切れ',
      statusConflict: '競合あり',
      quickSwitch: 'クイック切り替え',
      scanExternal: 'Agent ツールの新しい Skills を確認',
      export: 'ZIP を書き出す',
      importTitle: 'Agent Skills を読み込む',
      importSummary: (total: number, existing: number, added: number) =>
        `${total} 個の Skills を検出（${existing} 個は既存、${added} 個は新規）`,
      existingSkills: '既存',
      newSkills: '新規',
      keepHub: 'PromptClip のバージョンを保持',
      useExternal: 'この外部バージョンを使用',
      skipImport: 'スキップ',
      confirmImport: '読み込みを確定',
      importing: '読み込み中…',
      importingProgress: (current: number, total: number) => `読み込み中 (${current}/${total})…`,
      importingProgressDetail: (skill: string, current: number, total: number) =>
        `${skill} を読み込み中（${current}/${total} 件目）`,
      close: '閉じる',
      sourceCount: (count: number) => `${count} 件のソース`,
      invalidExternalEntries: (count: number) =>
        `${count} 件の外部 Skill をスキャンできませんでした`,
      invalidBrokenLinkCountBadge: (count: number) => `削除可能なリンク切れ ${count} 件`,
      invalidGroupTitle: (code: string) => {
        switch (code) {
          case 'skill_external_link_invalid':
            return '壊れたシンボリックリンク';
          case 'skill_markdown_invalid_type':
            return '入口ファイルがシンボリックリンク';
          case 'skill_content_symlink':
            return '内部にシンボリックリンクを含む';
          case 'invalid_skill_id':
            return '無効なディレクトリ名';
          case 'skill_name_mismatch':
            return '名前とディレクトリ名の不一致';
          case 'skill_markdown_missing':
            return 'SKILL.md が見つかりません';
          default:
            return 'その他のスキャン不可項目';
        }
      },
      invalidGroupHint: (code: string) => {
        switch (code) {
          case 'skill_external_link_invalid':
            return '参照先が存在しないかフォルダーではないリンクです。安全に削除できます。';
          case 'skill_markdown_invalid_type':
            return 'SKILL.md がシンボリックリンクです（外部プラグインスイートが生成したサブ Skill など）。元のツールで管理するため読み込み対象外です。';
          case 'skill_content_symlink':
            return '内部にシンボリックリンクを含みます（node_modules 等を同梱するプラグインリポジトリなど）。実行環境保護のため読み込み対象外です。';
          default:
            return null;
        }
      },
      cleanupBrokenLink: 'リンクを削除',
      cleanupAllBrokenLinks: 'すべて削除',
      cleaningBrokenLinks: '削除中…',
      confirmCleanupBrokenLinkTitle: '壊れたシンボリックリンクを削除',
      confirmCleanupBrokenLink: (name: string, path: string) =>
        `壊れたシンボリックリンク「${name}」を削除しますか？\n\nパス：${path}\n\n切れたシンボリックリンク本体のみを削除し、通常のフォルダーは削除しません。`,
      confirmCleanupAllBrokenLinks: (count: number) =>
        `${count} 件の壊れたシンボリックリンクをすべて削除しますか？\n\n切れたシンボリックリンク本体のみを削除し、通常のフォルダーは削除しません。`,
      cleanupBrokenLinksSuccess: (count: number) =>
        `${count} 件の壊れたシンボリックリンクを削除しました`,
      skillScanError: (code: string, params: Record<string, string>) => {
        switch (code) {
          case 'invalid_skill_id':
            return `ディレクトリ名「${params.skillId ?? ''}」は有効な Skill 名ではありません（英数字と - _ . @ : のみ、先頭・末尾の . は不可、最大 128 文字）。`;
          case 'skill_name_mismatch':
            return `フロントマターの name「${params.metadataName ?? ''}」がディレクトリ名「${params.directoryName ?? ''}」と一致しません。`;
          case 'skill_markdown_missing':
            return 'Skill 入口ファイル（SKILL.md）がありません。';
          case 'skill_markdown_invalid_type':
            return 'Skill 入口ファイルは通常のファイルである必要があります（リンクは不可）。';
          case 'skill_source_invalid':
            return 'この Skill ディレクトリはフォルダーでも有効なリンクでもありません。';
          case 'skill_external_link_invalid':
            return 'シンボリックリンクが壊れているか、フォルダーを指していません。';
          case 'skill_frontmatter_missing':
            return 'Skill ファイルに YAML フロントマターがありません（「---」で始まる必要があります）。';
          case 'skill_frontmatter_unclosed':
            return 'YAML フロントマターが閉じられていません（末尾の「---」がありません）。';
          case 'skill_frontmatter_invalid':
            return 'YAML フロントマターを解析できませんでした（name と description が必要です）。';
          case 'skill_description_empty':
            return 'Skill の説明が空です。';
          case 'skill_content_symlink':
            return `Skill 内にシンボリックリンク（「${params.path ?? ''}」）が含まれています（依存関係付きプラグインリポジトリなど）。元のツールで管理してください。`;
          case 'skill_content_special_file':
            return `Skill 内に未対応の特殊ファイル（「${params.path ?? ''}」）が含まれています。`;
          case 'skill_io_error':
            return `${params.operation ?? ''} の実行中にファイルシステムエラーが発生しました：${params.message ?? ''}`;
          case 'skill_path_outside_root':
            return 'Skill ディレクトリの構造が無効です。';
          default:
            return 'この Skill はスキャンできませんでした。ディレクトリ構造を確認してください。';
        }
      },
      revealExternalPath: (path: string) => `ファイルマネージャーで ${path} を表示`,
      createTitle: 'Skill を新規作成',
      skillName: 'Skill 名',
      skillNameHint: '小文字、数字、単一のハイフンのみ、最大64文字です。',
      skillDescription: 'Skill の説明',
      cancel: 'キャンセル',
      confirmCreate: '作成して開く',
      archiveTitle: 'Skill アーカイブをアップロード',
      archiveConflict: '同名の Skill があります。保持するバージョンを選択してください。',
      confirmArchiveImport: '読み込む',
      backToSkills: 'Skills に戻る',
      revealSkillFolder: 'ファイルマネージャーで Skill フォルダーを表示',
      newFolder: '新規フォルダー',
      newFile: '新規テキストファイル',
      uploadFile: 'ファイルをアップロード',
      rename: '名前を変更',
      delete: '削除',
      deleteSkill: 'Skill を削除',
      deleteSkillTitle: 'Skill を削除',
      deleteSkillConfirm: (skill: string) => `「${skill}」を削除しますか？`,
      deleteSkillNote:
        'この操作は PromptClip から Skill を完全に削除します。元に戻すことはできません。',
      deleteManagedSkillNote:
        'この Skill は Agent ツールで使用中です。管理対象をすべて削除するか、Agent 側に残せます。シンボリックリンクは独立したコピーに変換されます。',
      deleteEverywhere: 'すべて削除',
      deletePromptClipOnly: 'PromptClip からのみ削除',
      download: 'ダウンロード',
      save: '保存',
      edit: '編集',
      preview: 'プレビュー',
      binaryNoPreview: 'このファイルはアプリ内で表示できません。ダウンロードして開いてください。',
      selectFile: '左側からファイルを選択してください',
      unsavedChanges: '未保存の変更を破棄しますか？',
      syncPartialFailure: '保存しましたが、一部のコピー先を同期できませんでした。',
      operationFailed: '操作に失敗しました。もう一度お試しください。',
      scanNoExternalFound: 'スキャンが完了しました。取り込み対象の外部 Skill は見つかりませんでした。',
      skillOperationError: (code: string, params: Record<string, string>) => {
        switch (code) {
          case 'skill_already_exists':
            return '同名の Skill がすでに存在します。別の名前を入力してください。';
          case 'skill_symlink_permission_denied':
            return 'シンボリックリンクの作成権限がありません。Windows では開発者モードを有効にするか、同期設定で「ファイルコピー」を選択してください。';
          case 'skill_file_conflict':
            return 'ファイルが外部で変更されています。上書きを防ぐため、再読み込みしてから編集してください。';
          case 'skill_file_too_large':
            return 'ファイルサイズが上限を超えています。';
          case 'skill_file_not_text':
            return 'このファイル形式はアプリ内でのテキスト編集に対応していません。';
          case 'skill_file_not_utf8':
            return '有効な UTF-8 テキストではないため、アプリ内で編集できません。';
          case 'skill_entry_exists':
            return '同名のファイルまたはフォルダーがすでに存在します。';
          case 'skill_entry_protected':
            return 'SKILL.md は保護されているため、名前変更や削除はできません。';
          case 'skill_archive_multiple_roots':
            return 'アーカイブに複数のトップレベルフォルダーが含まれています。1 回につき 1 つの Skill のみ取り込めます。';
          case 'skill_archive_too_large':
            return 'アーカイブサイズが 50 MiB の上限を超えています。';
          case 'skill_archive_expanded_too_large':
            return '展開後のサイズが 200 MiB の上限を超えています。';
          case 'skill_archive_too_many_entries':
            return 'アーカイブ内のファイル数が 5,000 件の上限を超えています。';
          case 'skill_archive_unsafe_path':
          case 'skill_archive_special_entry':
            return '安全でないパスまたは未対応のリンクが含まれているため取り込めません。';
          case 'skill_archive_extension_invalid':
            return '.zip または .skill 形式のアーカイブのみ対応しています。';
          case 'skill_archive_invalid':
            return 'アーカイブが無効または破損しています。';
          case 'skill_target_conflict':
            return '対象ツールディレクトリに管理外の同名項目があります。ツールアイコンをクリックして競合を解決してください。';
          case 'skill_target_group_mode_conflict':
            return '同じディレクトリを共有するツール間で同期方式が競合しています。設定で統一してください。';
          case 'skill_custom_tool_name_required':
            return 'カスタムツール名を入力してください。';
          case 'skill_custom_tool_path_required':
            return 'カスタムツールの Skills ディレクトリパスを入力してください。';
          case 'skill_custom_tool_path_not_absolute':
          case 'skill_custom_tool_path_invalid':
            return 'カスタムツールの Skills ディレクトリには有効な絶対パスを指定してください。';
          case 'skill_custom_tool_duplicate':
            return '同じ名前またはパスのカスタムツールがすでに存在します。';
          case 'skill_category_name_required':
            return 'カテゴリー名は必須です。';
          case 'skill_category_name_too_long':
            return 'カテゴリー名が長すぎます。';
          case 'skill_category_name_duplicate':
            return 'カテゴリー名がすでに存在します。';
          case 'skill_category_name_reserved':
            return 'この名前は予約されているため、別の名前を使用してください。';
          case 'skill_source_changed':
            return '外部 Skill の内容が変更されました。再スキャンしてから取り込んでください。';
          case 'skill_io_error':
            return params.message
              ? `ファイルシステムエラー：${params.message}`
              : 'ファイルの読み書きに失敗しました。権限を確認して再試行してください。';
          default:
            return params.message
              ? `操作に失敗しました：${params.message}`
              : '操作に失敗しました。もう一度お試しください。';
        }
      },
      invalidSkillName: 'Skill 名の形式が正しくありません。',
      exportSuccess: 'Skill を書き出しました。',
      protected: '保護対象',
      defaultSyncMode: 'デフォルトの同期方式',
      inheritMode: '全体設定を使用',
      symlinkMode: 'シンボリックリンク',
      copyMode: 'ファイルコピー',
      settingsTitle: '設定',
      syncTab: '同期設定',
      syncDescription: 'Skills を Agent ツールへ書き出す方式を設定します。',
      storageTab: 'データ保存',
      storageDescription: 'PromptClip はすべての Skill をローカルフォルダーに保存します。',
      storagePath: '保存場所',
      storageOpen: 'ファイルマネージャーで開く',
      storageDesktopOnly: 'データ保存はデスクトップ版のみで利用できます。',
      storageOpenFailed: '開けませんでした。もう一度お試しください。',
      saveSettings: '設定を保存',
      migrationHint: '保存後、有効な Skills は新しい方式へ移行します。失敗項目は再試行できます。',
      agentNotInstalled: '未インストール',
      uninstalledAgents: (count: number) => `未インストールの Agent（${count}）`,
      enableAgent: (tool: string) => `${tool} を有効化`,
      disableAgent: (tool: string) => `${tool} を無効化`,
      agentDisabledHint: '無効化した Agent は Skill カードとサイドバーに表示されず、同期にも参加しません。',
      customTools: 'カスタムツール',
      customToolHint: '組み込みで対応していない Agent ツールを追加します。名前と Skills を読み取るディレクトリパスを入力してください。',
      customToolName: 'ツール名',
      customToolNamePlaceholder: '例: MyAgent',
      customToolPath: 'Skills ディレクトリパス',
      customToolPathPlaceholder: 'Agent が Skills を読み取るディレクトリの絶対パス',
      customToolSelectPath: 'フォルダーを選択',
      customToolAdd: '追加',
      customToolRemove: 'カスタムツールを削除',
      dragHandle: 'ドラッグで並び替え',
      dragHint: 'ハンドルをドラッグして Agent の順序を変更できます。カードとサイドバーに反映されます。',
      // Skill 编辑画面：ファイル操作ダイアログ / コンテキストメニュー
      newFolderTitle: '新規フォルダ',
      newFileTitle: '新規テキストファイル',
      renameTitle: '名前の変更',
      folderName: 'フォルダ名',
      fileName: 'ファイル名',
      namePlaceholder: '名前を入力',
      confirm: '確認',
      deleteEntryConfirm: (name: string) => `「${name}」を削除しますか？`,
      deleteEntryNote: 'この操作は元に戻せません。',
      dropHint: 'ファイルをここにドロップして取り込む',
      dropFolderUnsupported: 'フォルダの取り込みには対応していません。ファイルを指定してください。',
      dropConflictSkipped: (count: number) =>
        `${count} 件のファイルは同名のファイルがすでに存在するためスキップしました。`,
      dropMoveIntoSelf: '自身または自身のサブフォルダには移動できません。',
      dropConflictMove: (name: string) => `「${name}」と同名のファイルがすでに存在するため移動できませんでした。`,
      categories: 'カテゴリー',
      defaultCategory: 'デフォルト',
      addCategory: '新規カテゴリー',
      categoryName: 'カテゴリー名',
      categoryNamePlaceholder: 'カテゴリー名を入力',
      renameCategory: 'カテゴリー名を変更',
      deleteCategory: 'カテゴリーを削除',
      deleteCategoryConfirm: (name: string) => `カテゴリー「${name}」を削除しますか？`,
      deleteCategoryNote: 'このカテゴリーの Skill は「デフォルト」に戻り、削除されません。',
      addToCategory: 'カテゴリーに追加',
      newCategory: '新規カテゴリー',
      selectAll: 'すべて選択',
      deselectAll: '選択を解除',
      noSkillsInCategory: 'このカテゴリーに Skill はまだありません',
      noCategoriesYet: 'カテゴリーはまだありません',
      quickCreateCategoryPlaceholder: '新しいカテゴリー名',
      categoryNameRequired: 'カテゴリー名は必須です',
      categoryNameTooLong: 'カテゴリー名が長すぎます',
      categoryNameDuplicate: 'カテゴリー名がすでに存在します',
      categoryNameReserved: 'この名前は予約されているため、別の名前を使用してください',
    },
    metadataFields: {
      id: 'ID',
      title: 'タイトル',
      tags: 'タグ',
      created: '作成日時',
      modified: '更新日時',
      copy_count: 'コピー回数',
      pinned: 'お気に入り状態',
    } satisfies Record<PromptMetadataField, string>,
    recycle: {
      title: 'ゴミ箱',
      commandOpen: 'ゴミ箱を開く',
      empty: 'ゴミ箱は空です',
      emptyAll: 'すべて空にする',
      view: '表示',
      restore: '復元',
      permanentDelete: '完全に削除',
      closeDetail: '詳細を閉じる',
      hasAnnotationsBadge: '注釈あり',
      loading: '読み込み中...',
      permanentlyDeleted: '完全に削除しました',
      allCleared: 'ゴミ箱を空にしました',
      restoreSuffix: (counter: number) => `-復元${counter}`,
      deletedAt: (date: string) => `削除日時 ${date}`,
      confirmRestore: (title: string) => `"${title}" を復元しますか？`,
      confirmPermanentDelete: (title: string) =>
        `"${title}" を完全に削除しますか？この操作は取り消せません。`,
      confirmEmptyAll: 'ゴミ箱を空にしますか？すべてのファイルが完全に削除されます。',
      restored: (title: string) => `"${title}" を復元しました`,
      restoreFailed: '復元に失敗しました。再試行してください',
      deleteFailed: '削除に失敗しました。再試行してください',
      emptyFailed: '一部の操作が失敗しました。再試行してください',
    },
    markdownEditor: {
      slashMenuLabel: 'スラッシュ挿入コマンド',
      slashMenuClose: 'スラッシュメニューを閉じる',
      toolbarLabel: 'Markdown 書式ツールバー',
      toolbar: {
        h1: '見出し 1',
        h2: '見出し 2',
        h3: '見出し 3',
        bold: '太字',
        italic: '斜体',
        inlineCode: 'インラインコード',
        link: 'リンク',
        ul: '箇条書き',
        ol: '番号付きリスト',
        quote: '引用',
        codeBlock: 'コードブロック',
        task: 'タスクリスト',
      },
      slash: {
        h1: '見出し 1',
        h2: '見出し 2',
        h3: '見出し 3',
        bold: '太字',
        italic: '斜体',
        inlineCode: 'インラインコード',
        link: 'リンク',
        ul: '箇条書き',
        ol: '番号付きリスト',
        quote: '引用',
        codeBlock: 'コードブロック',
        task: 'タスクリスト',
        noMatch: '一致するコマンドがありません',
      },
    },
  },
} as const;

export type AppMessages = (typeof messages)[Locale];
