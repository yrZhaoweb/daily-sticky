export type StickyCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface VisibleDisplayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StickyWindowSize {
  width: number;
  height: number;
}

export interface StickyWindowBounds extends StickyWindowSize {
  x: number;
  y: number;
}

export function snapBoundsToCorner(
  displayBounds: VisibleDisplayBounds,
  windowSize: StickyWindowSize,
  corner: StickyCorner,
  margin = 16
): StickyWindowBounds {
  const left = displayBounds.x + margin;
  const right = displayBounds.x + displayBounds.width - windowSize.width - margin;
  const top = displayBounds.y + margin;
  const bottom = displayBounds.y + displayBounds.height - windowSize.height - margin;

  return {
    x: corner.endsWith('right') ? right : left,
    y: corner.startsWith('bottom') ? bottom : top,
    width: windowSize.width,
    height: windowSize.height
  };
}
