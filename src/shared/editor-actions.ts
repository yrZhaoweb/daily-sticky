export type InlineFormat = 'bold' | 'italic' | 'code';
export type BlockFormat =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'checklist'
  | 'bulletedList'
  | 'numberedList'
  | 'quote'
  | 'codeBlock'
  | 'divider'
  | 'table';

export interface EnterResult {
  handled: boolean;
  content: string;
  cursor: number;
}

export interface SelectionResult {
  content: string;
  selectionStart: number;
  selectionEnd: number;
}

const inlineMarkers: Record<InlineFormat, string> = {
  bold: '**',
  italic: '*',
  code: '`'
};

function getLineBounds(content: string, cursor: number): { start: number; end: number; text: string } {
  const start = content.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
  const nextLineBreak = content.indexOf('\n', cursor);
  const end = nextLineBreak === -1 ? content.length : nextLineBreak;

  return {
    start,
    end,
    text: content.slice(start, end)
  };
}

function removeCurrentLine(content: string, line: { start: number; end: number }): string {
  return `${content.slice(0, line.start)}${content.slice(line.end + (content[line.end] === '\n' ? 1 : 0))}`;
}

function stripBlockPrefix(lineText: string): { text: string; removedLength: number } {
  const match = lineText.match(/^(#{1,6}\s+|[-*]\s+\[[ xX]\]\s+|[-*]\s+|\d+\.\s+|>\s+)/);

  if (!match) {
    return { text: lineText, removedLength: 0 };
  }

  return {
    text: lineText.slice(match[0].length),
    removedLength: match[0].length
  };
}

export function handleEditorEnter(content: string, cursor: number): EnterResult {
  const line = getLineBounds(content, cursor);
  const beforeCursor = content.slice(line.start, cursor);
  const checklistMatch = beforeCursor.match(/^(\s*)- \[[ xX]\]\s?(.*)$/);
  const bulletMatch = beforeCursor.match(/^(\s*)[-*]\s?(.*)$/);
  const numberedMatch = beforeCursor.match(/^(\s*)(\d+)\.\s?(.*)$/);

  if (checklistMatch) {
    const [, indent, text] = checklistMatch;

    if (!text.trim()) {
      return { handled: true, content: removeCurrentLine(content, line), cursor: line.start };
    }

    const insertion = `\n${indent}- [ ] `;
    return {
      handled: true,
      content: `${content.slice(0, cursor)}${insertion}${content.slice(cursor)}`,
      cursor: cursor + insertion.length
    };
  }

  if (bulletMatch) {
    const [, indent, text] = bulletMatch;

    if (!text.trim()) {
      return { handled: true, content: removeCurrentLine(content, line), cursor: line.start };
    }

    const insertion = `\n${indent}- `;
    return {
      handled: true,
      content: `${content.slice(0, cursor)}${insertion}${content.slice(cursor)}`,
      cursor: cursor + insertion.length
    };
  }

  if (numberedMatch) {
    const [, indent, numberText, text] = numberedMatch;

    if (!text.trim()) {
      return { handled: true, content: removeCurrentLine(content, line), cursor: line.start };
    }

    const insertion = `\n${indent}${Number(numberText) + 1}. `;
    return {
      handled: true,
      content: `${content.slice(0, cursor)}${insertion}${content.slice(cursor)}`,
      cursor: cursor + insertion.length
    };
  }

  return {
    handled: false,
    content,
    cursor
  };
}

export function indentLineAtCursor(content: string, cursor: number, direction: 1 | -1): SelectionResult {
  const line = getLineBounds(content, cursor);

  if (direction === 1) {
    return {
      content: `${content.slice(0, line.start)}  ${content.slice(line.start)}`,
      selectionStart: cursor + 2,
      selectionEnd: cursor + 2
    };
  }

  const removable = content.slice(line.start, line.start + 2) === '  ' ? 2 : content[line.start] === '\t' ? 1 : 0;

  if (!removable) {
    return {
      content,
      selectionStart: cursor,
      selectionEnd: cursor
    };
  }

  return {
    content: `${content.slice(0, line.start)}${content.slice(line.start + removable)}`,
    selectionStart: Math.max(line.start, cursor - removable),
    selectionEnd: Math.max(line.start, cursor - removable)
  };
}

export function applyInlineFormat(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  format: InlineFormat
): SelectionResult {
  const marker = inlineMarkers[format];
  const selected = content.slice(selectionStart, selectionEnd);
  const before = content.slice(selectionStart - marker.length, selectionStart);
  const after = content.slice(selectionEnd, selectionEnd + marker.length);

  if (before === marker && after === marker) {
    return {
      content: `${content.slice(0, selectionStart - marker.length)}${selected}${content.slice(selectionEnd + marker.length)}`,
      selectionStart: selectionStart - marker.length,
      selectionEnd: selectionEnd - marker.length
    };
  }

  return {
    content: `${content.slice(0, selectionStart)}${marker}${selected}${marker}${content.slice(selectionEnd)}`,
    selectionStart: selectionStart + marker.length,
    selectionEnd: selectionEnd + marker.length
  };
}

export function insertAtCursor(content: string, cursor: number, insertion: string, cursorOffset = insertion.length): SelectionResult {
  return {
    content: `${content.slice(0, cursor)}${insertion}${content.slice(cursor)}`,
    selectionStart: cursor + cursorOffset,
    selectionEnd: cursor + cursorOffset
  };
}

export function applyBlockFormat(content: string, cursor: number, format: BlockFormat): SelectionResult {
  const line = getLineBounds(content, cursor);
  const stripped = stripBlockPrefix(line.text);
  const relativeCursor = Math.max(0, cursor - line.start - stripped.removedLength);

  const lineFormats: Partial<Record<BlockFormat, string>> = {
    paragraph: '',
    heading1: '# ',
    heading2: '## ',
    heading3: '### ',
    checklist: '- [ ] ',
    bulletedList: '- ',
    numberedList: '1. ',
    quote: '> '
  };

  const replaceLine = (replacement: string, selectionOffset: number): SelectionResult => {
    const tailStart = replacement.endsWith('\n') && content[line.end] === '\n' ? line.end + 1 : line.end;

    return {
      content: `${content.slice(0, line.start)}${replacement}${content.slice(tailStart)}`,
      selectionStart: line.start + selectionOffset,
      selectionEnd: line.start + selectionOffset
    };
  };

  if (format in lineFormats) {
    const prefix = lineFormats[format] ?? '';
    const nextLine = `${prefix}${stripped.text}`;
    return replaceLine(nextLine, Math.min(nextLine.length, prefix.length + relativeCursor));
  }

  if (format === 'table') {
    const cellText = stripped.text.trim();
    const template = `| 项目 | 状态 |\n| --- | --- |\n| ${cellText} |  |\n`;
    const cursorOffset = template.indexOf('|  |') + 2;
    return replaceLine(template, cursorOffset);
  }

  if (format === 'codeBlock') {
    const template = stripped.text.trim() ? `\`\`\`\n${stripped.text}\n\`\`\`` : '```\n\n```';
    return replaceLine(template, stripped.text.trim() ? template.length : 4);
  }

  if (format === 'divider') {
    return replaceLine('---', 3);
  }

  return {
    content,
    selectionStart: cursor,
    selectionEnd: cursor
  };
}

export function toggleChecklistAtCursor(content: string, cursor: number): SelectionResult {
  const line = getLineBounds(content, cursor);
  const match = line.text.match(/^(\s*[-*]\s+\[)([ xX])(\]\s*)/);

  if (!match) {
    return applyBlockFormat(content, cursor, 'checklist');
  }

  const [, start, state, end] = match;
  const nextState = state.toLowerCase() === 'x' ? ' ' : 'x';
  const nextLine = `${start}${nextState}${end}${line.text.slice(match[0].length)}`;

  return {
    content: `${content.slice(0, line.start)}${nextLine}${content.slice(line.end)}`,
    selectionStart: cursor,
    selectionEnd: cursor
  };
}
