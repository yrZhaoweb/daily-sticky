import { app, BrowserWindow, ipcMain, screen } from 'electron';
import Store from 'electron-store';
import { join } from 'path';
import { fileURLToPath } from 'url';
import {
  createEmptyNotesState,
  ensureNoteForDate,
  getNoteById,
  listNotesForDate,
  listStoredDateKeys,
  migrateNotesState,
  updateNoteContent
} from '../shared/daily-notes';
import { getTodayKey } from '../shared/date-utils';
import { ensureBoundsVisible, snapBoundsToCorner } from '../shared/window-placement';
import type { DailyNote, DailyNotesState, StickyWindowBounds } from '../shared/daily-notes';
import type { StickyCorner } from '../shared/window-placement';

interface AppStore {
  alwaysOnTop: boolean;
  notes: DailyNotesState | unknown;
  windows: Record<string, StickyWindowRecord>;
}

interface StickyWindowRecord {
  id: string;
  noteId: string;
  createdAt: number;
  updatedAt: number;
  windowBounds?: StickyWindowBounds;
}

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const defaultWindowBounds: StickyWindowBounds = {
  x: 0,
  y: 0,
  width: 430,
  height: 560
};

const store = new Store<AppStore>({
  defaults: {
    alwaysOnTop: true,
    notes: createEmptyNotesState(),
    windows: {}
  }
});

const noteWindows = new Map<string, BrowserWindow>();
const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
}

function getNotesState(): DailyNotesState {
  const notes = migrateNotesState(store.get('notes'));
  store.set('notes', notes);
  return notes;
}

function persistNotesState(notes: DailyNotesState): void {
  store.set('notes', notes);
}

function createWindowId(): string {
  return `window-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function persistWindowRecord(record: StickyWindowRecord): void {
  store.set(`windows.${record.id}`, record);
}

function applyAlwaysOnTop(window: BrowserWindow, alwaysOnTop = store.get('alwaysOnTop')): void {
  if (alwaysOnTop) {
    window.setAlwaysOnTop(true, 'floating');
  } else {
    window.setAlwaysOnTop(false);
  }

  window.setVisibleOnAllWorkspaces(alwaysOnTop, { visibleOnFullScreen: true });
}

function getInitialBounds(note: DailyNote, windowRecord?: StickyWindowRecord): StickyWindowBounds {
  const visibleDisplays = screen.getAllDisplays().map((display) => display.workArea);

  if (windowRecord?.windowBounds) {
    return ensureBoundsVisible(windowRecord.windowBounds, visibleDisplays, 18);
  }

  if (note.windowBounds) {
    return ensureBoundsVisible(note.windowBounds, visibleDisplays, 18);
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  return snapBoundsToCorner(primaryDisplay.workArea, defaultWindowBounds, 'top-right', 18);
}

function loadRenderer(window: BrowserWindow, noteId: string, windowId: string): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(
      `${process.env.ELECTRON_RENDERER_URL}?noteId=${encodeURIComponent(noteId)}&windowId=${encodeURIComponent(windowId)}`
    );
    return;
  }

  window.loadFile(join(__dirname, '../renderer/index.html'), {
    query: { noteId, windowId }
  });
}

function rememberWindowBounds(windowId: string, window: BrowserWindow): void {
  if (window.isDestroyed() || window.isMinimized()) {
    return;
  }

  const windows = store.get('windows');
  const existing = windows[windowId];

  if (!existing) {
    return;
  }

  persistWindowRecord({
    ...existing,
    updatedAt: Date.now(),
    windowBounds: window.getBounds()
  });
}

function createNoteWindow(note: DailyNote, windowId = createWindowId()): BrowserWindow {
  const existing = noteWindows.get(windowId);

  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.restore();
    existing.focus();
    return existing;
  }

  const windows = store.get('windows');
  const windowRecord =
    windows[windowId] ?? {
      id: windowId,
      noteId: note.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  const bounds = getInitialBounds(note, windowRecord);
  const window = new BrowserWindow({
    ...bounds,
    minWidth: 340,
    minHeight: 420,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: store.get('alwaysOnTop'),
    skipTaskbar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  persistWindowRecord({
    ...windowRecord,
    noteId: note.id,
    updatedAt: Date.now(),
    windowBounds: bounds
  });
  noteWindows.set(windowId, window);
  applyAlwaysOnTop(window);
  loadRenderer(window, note.id, windowId);

  window.once('ready-to-show', () => {
    window.show();
    window.focus();
  });

  window.on('move', () => rememberWindowBounds(windowId, window));
  window.on('resize', () => rememberWindowBounds(windowId, window));
  window.on('closed', () => noteWindows.delete(windowId));

  return window;
}

function createOrOpenPrimaryWindowForToday(): void {
  const existingWindows = BrowserWindow.getAllWindows().filter((window) => !window.isDestroyed());

  if (existingWindows.length > 0) {
    const [firstWindow] = existingWindows;
    firstWindow.restore();
    firstWindow.show();
    firstWindow.focus();
    return;
  }

  const dateKey = getTodayKey();
  const result = ensureNoteForDate(getNotesState(), dateKey, Date.now());
  persistNotesState(result.state);
  createNoteWindow(result.note);
}

if (singleInstanceLock) {
  app.on('second-instance', () => {
    createOrOpenPrimaryWindowForToday();
  });

  app.whenReady().then(() => {
    createOrOpenPrimaryWindowForToday();

    app.on('activate', () => {
      createOrOpenPrimaryWindowForToday();
    });
  });
}

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.handle('date:today', () => getTodayKey());

ipcMain.handle('notes:get', (_event, noteId: string) => {
  const note = getNoteById(getNotesState(), noteId);

  if (!note) {
    throw new Error(`Note not found: ${noteId}`);
  }

  return note;
});

ipcMain.handle('notes:ensure-for-date', (_event, dateKey: string, windowId: string) => {
  const result = ensureNoteForDate(getNotesState(), dateKey, Date.now());
  persistNotesState(result.state);

  if (windowId) {
    const windows = store.get('windows');
    const existing = windows[windowId];

    if (existing) {
      persistWindowRecord({
        ...existing,
        noteId: result.note.id,
        updatedAt: Date.now()
      });
    }
  }

  return result.note;
});

ipcMain.handle('notes:create', (_event, dateKey: string) => {
  const result = ensureNoteForDate(getNotesState(), dateKey, Date.now());
  persistNotesState(result.state);
  createNoteWindow(result.note);

  return result.note;
});

ipcMain.handle('notes:save', (_event, noteId: string, content: string) => {
  if (typeof noteId !== 'string' || typeof content !== 'string') {
    throw new Error('Invalid note payload');
  }

  const nextState = updateNoteContent(getNotesState(), noteId, content, Date.now());
  persistNotesState(nextState);
  const note = getNoteById(nextState, noteId);

  if (note) {
    for (const window of noteWindows.values()) {
      window.webContents.send('notes:changed', note);
    }
  }

  return note;
});

ipcMain.handle('notes:list-for-date', (_event, dateKey: string) => {
  return listNotesForDate(getNotesState(), dateKey);
});

ipcMain.handle('notes:list-dates', () => {
  return listStoredDateKeys(getNotesState());
});

ipcMain.handle('window:get-always-on-top', () => {
  return store.get('alwaysOnTop');
});

ipcMain.handle('window:set-always-on-top', (_event, value: boolean) => {
  const nextValue = Boolean(value);
  store.set('alwaysOnTop', nextValue);

  for (const window of noteWindows.values()) {
    applyAlwaysOnTop(window, nextValue);
  }

  return nextValue;
});

ipcMain.handle('window:snap-to-corner', (event, windowId: string, corner: StickyCorner) => {
  const window = BrowserWindow.fromWebContents(event.sender);

  if (!window) {
    throw new Error('Window not found');
  }

  const display = screen.getDisplayMatching(window.getBounds());
  const nextBounds = snapBoundsToCorner(display.workArea, window.getBounds(), corner, 18);
  window.setBounds(nextBounds, true);

  const windows = store.get('windows');
  const existing = windows[windowId];

  if (existing) {
    persistWindowRecord({
      ...existing,
      updatedAt: Date.now(),
      windowBounds: nextBounds
    });
  }

  return nextBounds;
});

ipcMain.handle('window:action', (event, action: 'close' | 'minimize') => {
  const window = BrowserWindow.fromWebContents(event.sender);

  if (!window) {
    return;
  }

  if (action === 'close') {
    window.close();
    return;
  }

  if (action === 'minimize') {
    window.minimize();
  }
});
