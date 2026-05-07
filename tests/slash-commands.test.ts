import { describe, expect, it } from 'vitest';
import { applySlashCommand } from '../src/shared/slash-commands';

describe('slash commands', () => {
  it('replaces the active slash query with a heading template', () => {
    expect(applySlashCommand('计划\n/h', 5, 'heading1')).toEqual({
      content: '计划\n# ',
      cursor: 5
    });
  });

  it('inserts a checklist block from a bare slash', () => {
    expect(applySlashCommand('/\n明天', 1, 'checklist')).toEqual({
      content: '- [ ] \n明天',
      cursor: 6
    });
  });

  it('inserts a markdown table template', () => {
    expect(applySlashCommand('表格：/table', 9, 'table')).toEqual({
      content: '表格：| 项目 | 状态 |\n| --- | --- |\n|  |  |\n',
      cursor: 26
    });
  });

  it('supports numbered lists and dividers from slash commands', () => {
    expect(applySlashCommand('/num', 4, 'numberedList')).toEqual({
      content: '1. ',
      cursor: 3
    });

    expect(applySlashCommand('/divider', 8, 'divider')).toEqual({
      content: '---\n',
      cursor: 4
    });
  });
});
