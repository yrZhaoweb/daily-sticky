export type SlashCommandId =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'checklist'
  | 'bulletedList'
  | 'numberedList'
  | 'table'
  | 'quote'
  | 'code'
  | 'divider';

export interface SlashCommand {
  id: SlashCommandId;
  label: string;
  hint: string;
  keywords: string;
  template: string;
  cursorOffset: number;
}

export interface SlashCommandResult {
  content: string;
  cursor: number;
}

export const slashCommands: SlashCommand[] = [
  { id: 'heading1', label: '标题 1', hint: '# 大标题', keywords: 'h1 title biaoti 标题', template: '# ', cursorOffset: 2 },
  { id: 'heading2', label: '标题 2', hint: '## 小标题', keywords: 'h2 subtitle xiaobiaoti 标题', template: '## ', cursorOffset: 3 },
  { id: 'heading3', label: '标题 3', hint: '### 小节', keywords: 'h3 section xiaojie 标题', template: '### ', cursorOffset: 4 },
  { id: 'checklist', label: '待办', hint: '- [ ] Checklist', keywords: 'todo checklist check renwu 待办 任务', template: '- [ ] ', cursorOffset: 6 },
  { id: 'bulletedList', label: '项目符号', hint: '- 列表', keywords: 'bullet list liebiao 列表', template: '- ', cursorOffset: 2 },
  { id: 'numberedList', label: '编号列表', hint: '1. 列表', keywords: 'number numbered list num order paixu bianhao 编号 列表', template: '1. ', cursorOffset: 3 },
  {
    id: 'table',
    label: '表格',
    hint: 'Markdown table',
    keywords: 'table biaoge 表格',
    template: '| 项目 | 状态 |\n| --- | --- |\n|  |  |\n',
    cursorOffset: 23
  },
  { id: 'quote', label: '引用', hint: '> 引用', keywords: 'quote yinyong 引用', template: '> ', cursorOffset: 2 },
  { id: 'code', label: '代码块', hint: '```', keywords: 'code block daima 代码', template: '```\n\n```', cursorOffset: 4 },
  { id: 'divider', label: '分割线', hint: '---', keywords: 'divider line split fengexian 分割线', template: '---\n', cursorOffset: 4 }
];

export function getSlashQuery(content: string, cursor: number): { start: number; query: string } | undefined {
  const lineStart = content.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
  const beforeCursor = content.slice(lineStart, cursor);
  const slashIndex = beforeCursor.lastIndexOf('/');

  if (slashIndex < 0) {
    return undefined;
  }

  const query = beforeCursor.slice(slashIndex + 1);

  if (/\s/.test(query)) {
    return undefined;
  }

  return {
    start: lineStart + slashIndex,
    query
  };
}

export function filterSlashCommands(query: string): SlashCommand[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return slashCommands;
  }

  return slashCommands.filter((command) => {
    return `${command.id} ${command.label} ${command.hint} ${command.keywords}`.toLowerCase().includes(normalized);
  });
}

export function applySlashCommand(content: string, cursor: number, commandId: SlashCommandId): SlashCommandResult {
  const command = slashCommands.find((candidate) => candidate.id === commandId);
  const slash = getSlashQuery(content, cursor);

  if (!command || !slash) {
    return {
      content,
      cursor
    };
  }

  const nextContent = `${content.slice(0, slash.start)}${command.template}${content.slice(cursor)}`;

  return {
    content: nextContent,
    cursor: slash.start + command.cursorOffset
  };
}
