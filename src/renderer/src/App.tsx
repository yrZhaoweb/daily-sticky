import {
  Bold,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Code2,
  Hash,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  MoveDownLeft,
  MoveDownRight,
  MoveUpLeft,
  MoveUpRight,
  Minus,
  Pin,
  PinOff,
  Plus,
  Quote,
  Table2,
  Type
} from 'lucide-react';
import type { KeyboardEvent, ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isDateKeyInput } from '../../shared/date-input';
import { defaultNoteContent } from '../../shared/daily-notes';
import { addDaysToKey } from '../../shared/date-utils';
import { createLivePreviewMarkdown } from '../../shared/markdown-live-preview';
import { applyBlockFormat, applyInlineFormat, handleEditorEnter, indentLineAtCursor, toggleChecklistAtCursor } from '../../shared/editor-actions';
import type { BlockFormat, InlineFormat, SelectionResult } from '../../shared/editor-actions';
import { applySlashCommand, filterSlashCommands, getSlashQuery } from '../../shared/slash-commands';
import type { SlashCommandId } from '../../shared/slash-commands';
import type { StickyCorner } from '../../shared/window-placement';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const cornerActions: Array<{ corner: StickyCorner; title: string; icon: ReactElement }> = [
  { corner: 'top-left', title: '吸附左上角', icon: <MoveUpLeft size={14} /> },
  { corner: 'top-right', title: '吸附右上角', icon: <MoveUpRight size={14} /> },
  { corner: 'bottom-left', title: '吸附左下角', icon: <MoveDownLeft size={14} /> },
  { corner: 'bottom-right', title: '吸附右下角', icon: <MoveDownRight size={14} /> }
];

const blockActions: Array<{ title: string; hint: string; icon: ReactElement; format: BlockFormat }> = [
  { title: '正文', hint: '清除当前行块标记', icon: <Type size={14} />, format: 'paragraph' },
  { title: '标题 1', hint: '# 大标题', icon: <Heading1 size={14} />, format: 'heading1' },
  { title: '标题 2', hint: '## 小标题', icon: <Heading2 size={14} />, format: 'heading2' },
  { title: '标题 3', hint: '### 小节', icon: <Heading3 size={14} />, format: 'heading3' },
  { title: '待办', hint: '- [ ] Checklist', icon: <ListChecks size={14} />, format: 'checklist' },
  { title: '项目符号', hint: '- 列表', icon: <List size={14} />, format: 'bulletedList' },
  { title: '编号列表', hint: '1. 列表', icon: <ListOrdered size={14} />, format: 'numberedList' },
  { title: '引用', hint: '> 引用', icon: <Quote size={14} />, format: 'quote' },
  { title: '表格', hint: 'Markdown table', icon: <Table2 size={14} />, format: 'table' },
  { title: '代码块', hint: '```', icon: <Code2 size={14} />, format: 'codeBlock' },
  { title: '分割线', hint: '---', icon: <Minus size={14} />, format: 'divider' }
];

function getInitialNoteId(): string {
  return new URLSearchParams(window.location.search).get('noteId') ?? '';
}

function getInitialWindowId(): string {
  return new URLSearchParams(window.location.search).get('windowId') ?? '';
}

function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(date);
}

function getSlashMenuTop(textarea: HTMLTextAreaElement, value: string, cursor: number): number {
  const style = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(style.lineHeight) || 24;
  const paddingTop = Number.parseFloat(style.paddingTop) || 0;
  const lineIndex = value.slice(0, cursor).split('\n').length - 1;
  const toolbarHeight = 38;
  const rawTop = toolbarHeight + paddingTop + lineIndex * lineHeight - textarea.scrollTop + lineHeight + 6;
  const maxTop = Math.max(48, toolbarHeight + textarea.clientHeight - 220);

  return Math.max(48, Math.min(rawTop, maxTop));
}

export default function App(): ReactElement {
  const [noteId, setNoteId] = useState(getInitialNoteId);
  const [windowId] = useState(getInitialWindowId);
  const [dateKey, setDateKey] = useState('');
  const [content, setContent] = useState(defaultNoteContent);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [slashQuery, setSlashQuery] = useState<string | undefined>();
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [slashMenuTop, setSlashMenuTop] = useState(48);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newWindowDate, setNewWindowDate] = useState('');
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const loadedNoteIdRef = useRef('');
  const lastSavedContentRef = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const dateLabel = useMemo(() => (dateKey ? formatDateLabel(dateKey) : '...'), [dateKey]);
  const slashMatches = useMemo(() => filterSlashCommands(slashQuery ?? ''), [slashQuery]);
  const previewMarkdown = useMemo(() => createLivePreviewMarkdown(content), [content]);

  const updateSlashMenu = useCallback(
    (nextContent = content, cursor = textareaRef.current?.selectionStart ?? 0) => {
      const textarea = textareaRef.current;
      const slash = getSlashQuery(nextContent, cursor);
      setSlashQuery(slash?.query);
      setSelectedSlashIndex(0);

      if (slash && textarea) {
        setSlashMenuTop(getSlashMenuTop(textarea, nextContent, cursor));
        setShowInsertMenu(false);
      }
    },
    [content]
  );

  const loadNote = useCallback(
    async (nextNoteId: string) => {
      try {
        setErrorMessage('');
        const note = await window.stickyApi.getNote(nextNoteId);
        setNoteId(note.id);
        setDateKey(note.dateKey);
        setContent(note.content);
        lastSavedContentRef.current = note.content;
        loadedNoteIdRef.current = note.id;
        setSaveState('idle');
        setSlashQuery(undefined);
      } catch {
        setErrorMessage('读取失败');
        setSaveState('error');
      }
    },
    []
  );

  const loadDate = useCallback(
    async (nextDateKey: string) => {
      try {
        const note = await window.stickyApi.ensureNoteForDate(nextDateKey, windowId);
        await loadNote(note.id);
      } catch {
        setErrorMessage('读取失败');
        setSaveState('error');
      }
    },
    [loadNote, windowId]
  );

  useEffect(() => {
    let mounted = true;

    async function boot(): Promise<void> {
      try {
        const [today, topValue] = await Promise.all([window.stickyApi.getTodayKey(), window.stickyApi.getAlwaysOnTop()]);

        if (!mounted) return;

        setAlwaysOnTop(topValue);

        if (noteId) {
          await loadNote(noteId);
        } else {
          await loadDate(today);
        }
      } catch {
        if (!mounted) return;
        setErrorMessage('启动失败');
        setSaveState('error');
      }
    }

    boot();

    return () => {
      mounted = false;
    };
  }, [loadDate, loadNote, noteId]);

  useEffect(() => {
    return window.stickyApi.onNoteChanged((note) => {
      if (note.id !== loadedNoteIdRef.current) return;

      lastSavedContentRef.current = note.content;
      setContent(note.content);
      setDateKey(note.dateKey);
      setErrorMessage('');
      setSaveState('saved');
    });
  }, []);

  useEffect(() => {
    if (!noteId || loadedNoteIdRef.current !== noteId) return;
    if (content === lastSavedContentRef.current) return;

    const handle = window.setTimeout(async () => {
      try {
        setSaveState('saving');
        const saved = await window.stickyApi.saveNote(noteId, content);

        if (saved) {
          lastSavedContentRef.current = saved.content;
          setContent(saved.content);
        }

        setSaveState('saved');
        setErrorMessage('');
      } catch {
        setSaveState('error');
        setErrorMessage('保存失败');
      }
    }, 450);

    return () => window.clearTimeout(handle);
  }, [content, noteId]);

  const moveDay = (days: number): void => {
    if (!dateKey) return;
    loadDate(addDaysToKey(dateKey, days));
  };

  const openNewWindowDatePicker = (): void => {
    setNewWindowDate(dateKey);
    setShowDatePicker(true);
  };

  const createWindowForSelectedDate = async (): Promise<void> => {
    if (!isDateKeyInput(newWindowDate)) {
      setErrorMessage('日期无效');
      setSaveState('error');
      return;
    }

    try {
      await window.stickyApi.createNote(newWindowDate);
      setShowDatePicker(false);
      setErrorMessage('');
      setSaveState('idle');
    } catch {
      setErrorMessage('新建失败');
      setSaveState('error');
    }
  };

  const toggleAlwaysOnTop = async (): Promise<void> => {
    try {
      const next = await window.stickyApi.setAlwaysOnTop(!alwaysOnTop);
      setAlwaysOnTop(next);
      setErrorMessage('');
      setSaveState('idle');
    } catch {
      setErrorMessage('置顶失败');
      setSaveState('error');
    }
  };

  const snapToCorner = async (corner: StickyCorner): Promise<void> => {
    if (!windowId) return;
    await window.stickyApi.snapToCorner(windowId, corner);
  };

  const selectSlashCommand = (commandId: SlashCommandId): void => {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? content.length;
    const next = applySlashCommand(content, cursor, commandId);

    setContent(next.content);
    setSlashQuery(undefined);

    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(next.cursor, next.cursor);
    });
  };

  const applySelectionResult = (result: SelectionResult): void => {
    const textarea = textareaRef.current;

    setContent(result.content);
    setSlashQuery(undefined);

    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const applyFormat = (format: InlineFormat): void => {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? content.length;
    const selectionEnd = textarea?.selectionEnd ?? content.length;
    applySelectionResult(applyInlineFormat(content, selectionStart, selectionEnd, format));
  };

  const applyBlock = (format: BlockFormat): void => {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? content.length;
    applySelectionResult(applyBlockFormat(content, cursor, format));
    setShowInsertMenu(false);
  };

  const toggleChecklist = (): void => {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? content.length;
    applySelectionResult(toggleChecklistAtCursor(content, cursor));
  };

  const handleTextareaChange = (value: string, cursor: number): void => {
    setContent(value);
    updateSlashMenu(value, cursor);
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      applyFormat('bold');
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      applyFormat('italic');
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      toggleChecklist();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === '7') {
      event.preventDefault();
      applyBlock('numberedList');
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === '8') {
      event.preventDefault();
      applyBlock('bulletedList');
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.altKey && ['1', '2', '3'].includes(event.key)) {
      event.preventDefault();
      applyBlock(`heading${event.key}` as BlockFormat);
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const cursor = event.currentTarget.selectionStart;
      applySelectionResult(indentLineAtCursor(content, cursor, event.shiftKey ? -1 : 1));
      return;
    }

    if (slashQuery !== undefined && slashMatches.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedSlashIndex((index) => (index + 1) % slashMatches.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedSlashIndex((index) => (index - 1 + slashMatches.length) % slashMatches.length);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        selectSlashCommand(slashMatches[selectedSlashIndex].id);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setSlashQuery(undefined);
        return;
      }
    }

    if (event.key === 'Enter') {
      const next = handleEditorEnter(content, event.currentTarget.selectionStart);

      if (next.handled) {
        event.preventDefault();
        setContent(next.content);
        window.requestAnimationFrame(() => {
          textareaRef.current?.setSelectionRange(next.cursor, next.cursor);
        });
      }
    }
  };

  const statusText =
    errorMessage || (saveState === 'saving' ? '保存中' : saveState === 'saved' ? '已保存' : '本地');

  return (
    <main className="sticky-shell">
      <header className="titlebar">
        <div className="window-actions">
          <button className="traffic close" aria-label="关闭" onClick={() => window.stickyApi.windowAction('close')} />
          <button className="traffic minimize" aria-label="最小化" onClick={() => window.stickyApi.windowAction('minimize')} />
        </div>

        <div className="drag-title">Daily Sticky</div>

        <button
          className={`icon-button ${alwaysOnTop ? 'active' : ''}`}
          aria-label={alwaysOnTop ? '取消置顶' : '置顶'}
          title={alwaysOnTop ? '取消置顶' : '置顶'}
          onClick={toggleAlwaysOnTop}
        >
          {alwaysOnTop ? <Pin size={16} /> : <PinOff size={16} />}
        </button>
      </header>

      <section className="date-row">
        <button className="icon-button" aria-label="前一天" title="前一天" onClick={() => moveDay(-1)}>
          <ChevronLeft size={18} />
        </button>
        <button className="date-button" onClick={() => dateKey && loadDate(dateKey)} title={dateKey}>
          <span>{dateLabel}</span>
          <strong>{dateKey || 'loading'}</strong>
        </button>
        <button className="icon-button" aria-label="后一天" title="后一天" onClick={() => moveDay(1)}>
          <ChevronRight size={18} />
        </button>
      </section>

      <section className="note-tabs" aria-label="当天便利贴">
        <div className="sync-chip">同日同步</div>
        <button className="add-note-button" aria-label="新建便利贴" title="新建便利贴" onClick={openNewWindowDatePicker}>
          <Plus size={16} />
        </button>
        {showDatePicker ? (
          <div className="date-picker-popover">
            <label htmlFor="new-window-date">打开日期</label>
            <input
              id="new-window-date"
              type="date"
              value={newWindowDate}
              onChange={(event) => setNewWindowDate(event.target.value)}
            />
            <div className="date-picker-actions">
              <button onClick={() => setShowDatePicker(false)}>取消</button>
              <button className="primary" onClick={createWindowForSelectedDate}>
                打开
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="tool-row">
        <div className="corner-dock" aria-label="吸附到屏幕角落">
          {cornerActions.map((action) => (
            <button key={action.corner} title={action.title} aria-label={action.title} onClick={() => snapToCorner(action.corner)}>
              {action.icon}
            </button>
          ))}
        </div>

        <div className={`save-state ${saveState}`}>{statusText}</div>
      </section>

      <section className="note-plane live-editing">
        <div className="editor-ribbon" aria-label="编辑工具">
          <div className="editor-group">
            <button
              className="insert-menu-button"
              title="插入块"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setShowInsertMenu((value) => !value);
                setSlashQuery(undefined);
              }}
            >
              <Plus size={14} />
              <span>插入</span>
            </button>
          </div>
          <div className="editor-group compact">
            <button title="正文" onMouseDown={(event) => event.preventDefault()} onClick={() => applyBlock('paragraph')}>
              <Type size={14} />
            </button>
            <button title="标题" onMouseDown={(event) => event.preventDefault()} onClick={() => applyBlock('heading1')}>
              <Hash size={14} />
            </button>
            <button title="待办完成/取消" onMouseDown={(event) => event.preventDefault()} onClick={toggleChecklist}>
              <CheckSquare size={14} />
            </button>
          </div>
          <div className="editor-group compact">
            <button title="加粗" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('bold')}>
              <Bold size={14} />
            </button>
            <button title="斜体" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('italic')}>
              <Italic size={14} />
            </button>
            <button title="行内代码" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('code')}>
              <Code2 size={14} />
            </button>
          </div>
        </div>
        {showInsertMenu ? (
          <div className="block-menu">
            {blockActions.map((action) => (
              <button
                key={action.format}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyBlock(action.format);
                }}
              >
                {action.icon}
                <span>{action.title}</span>
                <small>{action.hint}</small>
              </button>
            ))}
          </div>
        ) : null}
        {slashQuery !== undefined && slashMatches.length > 0 ? (
          <div className="slash-menu" style={{ top: slashMenuTop }}>
            {slashMatches.map((command, index) => (
              <button
                key={command.id}
                className={index === selectedSlashIndex ? 'selected' : ''}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectSlashCommand(command.id);
                }}
              >
                <span>{command.label}</span>
                <small>{command.hint}</small>
              </button>
            ))}
          </div>
        ) : null}
        <div className="live-canvas">
          <textarea
            ref={textareaRef}
            value={content}
            spellCheck={false}
            onChange={(event) => handleTextareaChange(event.target.value, event.target.selectionStart)}
            onKeyDown={handleTextareaKeyDown}
            onKeyUp={() => updateSlashMenu()}
            onClick={() => updateSlashMenu()}
            onSelect={() => updateSlashMenu()}
            onScroll={() => updateSlashMenu()}
            aria-label="Markdown 便利贴内容"
          />
          <article className="markdown-preview live-preview" aria-label="Markdown 实时预览">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewMarkdown}</ReactMarkdown>
          </article>
        </div>
      </section>

    </main>
  );
}
