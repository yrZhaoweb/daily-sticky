import type { DateKey } from './date-utils';

export const defaultNoteContent = '# 今天\n\n- ';

export interface StickyWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DailyNote {
  id: string;
  dateKey: DateKey | string;
  content: string;
  createdAt: number;
  updatedAt: number;
  windowBounds?: StickyWindowBounds;
}

export interface DailyNotesState {
  notesById: Record<string, DailyNote>;
  noteIdsByDate: Record<string, string[]>;
}

interface LegacyDailyNote {
  dateKey: DateKey | string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface LegacyDailyNotesState {
  notesByDate: Record<string, LegacyDailyNote>;
}

export interface CreateNoteResult {
  state: DailyNotesState;
  note: DailyNote;
}

export function createEmptyNotesState(): DailyNotesState {
  return {
    notesById: {},
    noteIdsByDate: {}
  };
}

export function isDailyNotesState(value: unknown): value is DailyNotesState {
  const candidate = value as DailyNotesState | undefined;
  return Boolean(candidate?.notesById && candidate.noteIdsByDate);
}

function createNoteId(dateKey: DateKey | string, timestamp: number): string {
  return `${dateKey}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createNoteForDate(
  state: DailyNotesState,
  dateKey: DateKey | string,
  timestamp: number,
  requestedId?: string
): CreateNoteResult {
  const id = requestedId ?? createNoteId(dateKey, timestamp);
  const note: DailyNote = {
    id,
    dateKey,
    content: defaultNoteContent,
    createdAt: timestamp,
    updatedAt: timestamp,
    windowBounds: undefined
  };

  return {
    note,
    state: {
      notesById: {
        ...state.notesById,
        [id]: note
      },
      noteIdsByDate: {
        ...state.noteIdsByDate,
        [dateKey]: [id, ...(state.noteIdsByDate[dateKey] ?? [])]
      }
    }
  };
}

export function getNoteById(state: DailyNotesState, noteId: string): DailyNote | undefined {
  return state.notesById[noteId];
}

export function getPrimaryNoteForDate(state: DailyNotesState, dateKey: DateKey | string): DailyNote | undefined {
  const noteId = state.noteIdsByDate[dateKey]?.[0];
  return noteId ? state.notesById[noteId] : undefined;
}

export function ensureNoteForDate(
  state: DailyNotesState,
  dateKey: DateKey | string,
  timestamp: number
): CreateNoteResult {
  const existing = getPrimaryNoteForDate(state, dateKey);

  if (existing) {
    return {
      note: existing,
      state
    };
  }

  return createNoteForDate(state, dateKey, timestamp);
}

export function listNotesForDate(state: DailyNotesState, dateKey: DateKey | string): DailyNote[] {
  return (state.noteIdsByDate[dateKey] ?? [])
    .map((noteId) => state.notesById[noteId])
    .filter((note): note is DailyNote => Boolean(note));
}

export function updateNoteContent(
  state: DailyNotesState,
  noteId: string,
  content: string,
  timestamp: number
): DailyNotesState {
  const existing = state.notesById[noteId];

  if (!existing) {
    return state;
  }

  return {
    ...state,
    notesById: {
      ...state.notesById,
      [noteId]: {
        ...existing,
        content,
        updatedAt: timestamp
      }
    }
  };
}

export function updateNoteWindowBounds(
  state: DailyNotesState,
  noteId: string,
  windowBounds: StickyWindowBounds
): DailyNotesState {
  const existing = state.notesById[noteId];

  if (!existing) {
    return state;
  }

  return {
    ...state,
    notesById: {
      ...state.notesById,
      [noteId]: {
        ...existing,
        windowBounds
      }
    }
  };
}

export function listStoredDateKeys(state: DailyNotesState): string[] {
  return Object.keys(state.noteIdsByDate)
    .filter((dateKey) => state.noteIdsByDate[dateKey]?.some((noteId) => Boolean(state.notesById[noteId])))
    .sort((left, right) => right.localeCompare(left));
}

export function migrateNotesState(value: unknown): DailyNotesState {
  if (isDailyNotesState(value)) {
    return value;
  }

  const legacy = value as LegacyDailyNotesState | undefined;

  if (!legacy?.notesByDate) {
    return createEmptyNotesState();
  }

  return Object.values(legacy.notesByDate).reduce<DailyNotesState>((state, note) => {
    const id = `${note.dateKey}-primary`;

    return {
      notesById: {
        ...state.notesById,
        [id]: {
          id,
          dateKey: note.dateKey,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          windowBounds: undefined
        }
      },
      noteIdsByDate: {
        ...state.noteIdsByDate,
        [note.dateKey]: [id]
      }
    };
  }, createEmptyNotesState());
}
