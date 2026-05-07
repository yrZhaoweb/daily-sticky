import type { DailyNote } from '../shared/daily-notes';
import type { StickyCorner, StickyWindowBounds } from '../shared/window-placement';

export interface StickyApi {
  getTodayKey: () => Promise<string>;
  getNote: (noteId: string) => Promise<DailyNote>;
  ensureNoteForDate: (dateKey: string, windowId: string) => Promise<DailyNote>;
  createNote: (dateKey: string) => Promise<DailyNote>;
  saveNote: (noteId: string, content: string) => Promise<DailyNote | undefined>;
  listNotesForDate: (dateKey: string) => Promise<DailyNote[]>;
  listDates: () => Promise<string[]>;
  getAlwaysOnTop: () => Promise<boolean>;
  setAlwaysOnTop: (value: boolean) => Promise<boolean>;
  snapToCorner: (windowId: string, corner: StickyCorner) => Promise<StickyWindowBounds>;
  windowAction: (action: 'close' | 'minimize') => Promise<void>;
  onNoteChanged: (callback: (note: DailyNote) => void) => () => void;
}

declare global {
  interface Window {
    stickyApi: StickyApi;
  }
}
