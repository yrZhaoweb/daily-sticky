import { describe, expect, it } from 'vitest';
import {
  createNoteForDate,
  createEmptyNotesState,
  getNoteById,
  listNotesForDate,
  listStoredDateKeys,
  migrateNotesState,
  updateNoteContent,
  updateNoteWindowBounds
} from '../src/shared/daily-notes';

describe('daily notes state', () => {
  it('creates multiple notes for the same date with stable metadata', () => {
    const first = createNoteForDate(createEmptyNotesState(), '2026-05-07', 1234, 'note-a');
    const second = createNoteForDate(first.state, '2026-05-07', 1235, 'note-b');

    expect(listNotesForDate(second.state, '2026-05-07').map((note) => note.id)).toEqual(['note-b', 'note-a']);
    expect(getNoteById(second.state, 'note-a')).toEqual({
      id: 'note-a',
      dateKey: '2026-05-07',
      content: '# 今天\n\n- ',
      createdAt: 1234,
      updatedAt: 1234,
      windowBounds: undefined
    });
  });

  it('updates existing content without changing createdAt', () => {
    const created = createNoteForDate(createEmptyNotesState(), '2026-05-07', 1000, 'note-a');
    const updated = updateNoteContent(created.state, 'note-a', 'second', 2000);

    expect(getNoteById(updated, 'note-a')).toMatchObject({
      content: 'second',
      createdAt: 1000,
      updatedAt: 2000
    });
  });

  it('lists stored dates from newest to oldest', () => {
    const yesterday = createNoteForDate(createEmptyNotesState(), '2026-05-06', 1, 'note-y');
    const today = createNoteForDate(yesterday.state, '2026-05-07', 2, 'note-t');

    expect(listStoredDateKeys(today.state)).toEqual(['2026-05-07', '2026-05-06']);
  });

  it('persists window bounds independently for each note', () => {
    const created = createNoteForDate(createEmptyNotesState(), '2026-05-07', 1000, 'note-a');
    const updated = updateNoteWindowBounds(created.state, 'note-a', {
      x: 120,
      y: 40,
      width: 360,
      height: 440
    });

    expect(getNoteById(updated, 'note-a')?.windowBounds).toEqual({
      x: 120,
      y: 40,
      width: 360,
      height: 440
    });
  });

  it('migrates the previous one-note-per-day storage shape', () => {
    const migrated = migrateNotesState({
      notesByDate: {
        '2026-05-07': {
          dateKey: '2026-05-07',
          content: 'old note',
          createdAt: 10,
          updatedAt: 20
        }
      }
    });

    expect(listNotesForDate(migrated, '2026-05-07')).toEqual([
      {
        id: '2026-05-07-primary',
        dateKey: '2026-05-07',
        content: 'old note',
        createdAt: 10,
        updatedAt: 20,
        windowBounds: undefined
      }
    ]);
  });
});
