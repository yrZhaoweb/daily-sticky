import { describe, expect, it } from 'vitest';
import { ensureBoundsVisible, snapBoundsToCorner } from '../src/shared/window-placement';

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

  it('keeps restored bounds on screen when they are already visible', () => {
    expect(
      ensureBoundsVisible(
        { x: 100, y: 120, width: 430, height: 560 },
        [{ x: 0, y: 0, width: 1440, height: 900 }],
        18
      )
    ).toEqual({ x: 100, y: 120, width: 430, height: 560 });
  });

  it('moves restored bounds back to the primary display when they are offscreen', () => {
    expect(
      ensureBoundsVisible(
        { x: 3200, y: 100, width: 430, height: 560 },
        [{ x: 0, y: 0, width: 1440, height: 900 }],
        18
      )
    ).toEqual({ x: 992, y: 18, width: 430, height: 560 });
  });
});
