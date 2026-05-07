import { describe, expect, it } from 'vitest';
import { applyBlockFormat, applyInlineFormat, handleEditorEnter, indentLineAtCursor, toggleChecklistAtCursor } from '../src/shared/editor-actions';

describe('editor actions', () => {
  it('continues checklist items on enter', () => {
    expect(handleEditorEnter('- [ ] buy milk', 14)).toEqual({
      handled: true,
      content: '- [ ] buy milk\n- [ ] ',
      cursor: 21
    });
  });

  it('turns an empty checklist item into a blank line on enter', () => {
    expect(handleEditorEnter('- [ ] ', 6)).toEqual({
      handled: true,
      content: '',
      cursor: 0
    });
  });

  it('indents and outdents the current line', () => {
    expect(indentLineAtCursor('- item', 2, 1)).toEqual({
      content: '  - item',
      selectionStart: 4,
      selectionEnd: 4
    });
    expect(indentLineAtCursor('  - item', 4, -1)).toEqual({
      content: '- item',
      selectionStart: 2,
      selectionEnd: 2
    });
  });

  it('wraps selected text with bold markers', () => {
    expect(applyInlineFormat('hello world', 6, 11, 'bold')).toEqual({
      content: 'hello **world**',
      selectionStart: 8,
      selectionEnd: 13
    });
  });

  it('removes inline markers when the selection is already formatted', () => {
    expect(applyInlineFormat('hello **world**', 8, 13, 'bold')).toEqual({
      content: 'hello world',
      selectionStart: 6,
      selectionEnd: 11
    });
  });

  it('turns the current line into a heading without duplicating markers', () => {
    expect(applyBlockFormat('# Plan', 4, 'heading2')).toEqual({
      content: '## Plan',
      selectionStart: 5,
      selectionEnd: 5
    });
  });

  it('turns the current line into a checklist item', () => {
    expect(applyBlockFormat('买咖啡', 2, 'checklist')).toEqual({
      content: '- [ ] 买咖啡',
      selectionStart: 8,
      selectionEnd: 8
    });
  });

  it('toggles a checklist line between done and open', () => {
    expect(toggleChecklistAtCursor('- [ ] 买咖啡', 8)).toEqual({
      content: '- [x] 买咖啡',
      selectionStart: 8,
      selectionEnd: 8
    });

    expect(toggleChecklistAtCursor('- [x] 买咖啡', 8)).toEqual({
      content: '- [ ] 买咖啡',
      selectionStart: 8,
      selectionEnd: 8
    });
  });
});
