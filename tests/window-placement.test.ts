import { describe, expect, it } from 'vitest';
import { snapBoundsToCorner } from '../src/shared/window-placement';

describe('window placement', () => {
  it('snaps a sticky window to the top right visible display corner with a margin', () => {
    expect(
      snapBoundsToCorner(
        { x: 0, y: 0, width: 1440, height: 900 },
        { width: 430, height: 560 },
        'top-right',
        16
      )
    ).toEqual({
      x: 994,
      y: 16,
      width: 430,
      height: 560
    });
  });

  it('snaps a sticky window to the bottom left visible display corner with a margin', () => {
    expect(
      snapBoundsToCorner(
        { x: -1440, y: 0, width: 1440, height: 900 },
        { width: 360, height: 420 },
        'bottom-left',
        20
      )
    ).toEqual({
      x: -1420,
      y: 460,
      width: 360,
      height: 420
    });
  });
});
