/// <reference types="vite/client" />

import type { StickyApi } from '../../preload/types';

declare global {
  interface Window {
    stickyApi: StickyApi;
  }
}
