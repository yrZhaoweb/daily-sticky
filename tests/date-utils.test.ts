import { describe, expect, it } from 'vitest';
import { addDaysToKey, formatLocalDateKey, getTodayKey } from '../src/shared/date-utils';

describe('date utilities', () => {
  it('formats a local date key as YYYY-MM-DD', () => {
    expect(formatLocalDateKey(new Date(2026, 4, 7, 23, 59))).toBe('2026-05-07');
  });

  it('moves across month boundaries using local calendar dates', () => {
    expect(addDaysToKey('2026-05-01', -1)).toBe('2026-04-30');
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('allows deterministic today keys for callers that provide a clock value', () => {
    expect(getTodayKey(new Date(2026, 0, 2, 8, 0))).toBe('2026-01-02');
  });
});
