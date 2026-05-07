import { describe, expect, it } from 'vitest';
import { isDateKeyInput } from '../src/shared/date-input';

describe('date input validation', () => {
  it('accepts YYYY-MM-DD date input values', () => {
    expect(isDateKeyInput('2026-05-07')).toBe(true);
  });

  it('rejects empty or malformed date input values', () => {
    expect(isDateKeyInput('')).toBe(false);
    expect(isDateKeyInput('2026-5-7')).toBe(false);
    expect(isDateKeyInput('tomorrow')).toBe(false);
  });
});
