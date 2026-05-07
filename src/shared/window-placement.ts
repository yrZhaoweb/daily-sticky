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

function hasVisibleOverlap(bounds: StickyWindowBounds, displayBounds: VisibleDisplayBounds, minimumVisibleArea = 64): boolean {
  const left = Math.max(bounds.x, displayBounds.x);
  const right = Math.min(bounds.x + bounds.width, displayBounds.x + displayBounds.width);
  const top = Math.max(bounds.y, displayBounds.y);
  const bottom = Math.min(bounds.y + bounds.height, displayBounds.y + displayBounds.height);

  return right - left >= minimumVisibleArea && bottom - top >= minimumVisibleArea;
}

export function ensureBoundsVisible(
  bounds: StickyWindowBounds,
  displays: VisibleDisplayBounds[],
  margin = 16
): StickyWindowBounds {
  if (displays.some((displayBounds) => hasVisibleOverlap(bounds, displayBounds))) {
    return bounds;
  }

  const primaryDisplay = displays[0];

  if (!primaryDisplay) {
    return bounds;
  }

  return snapBoundsToCorner(primaryDisplay, bounds, 'top-right', margin);
}
