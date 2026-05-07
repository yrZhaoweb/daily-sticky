import { contextBridge, ipcRenderer } from 'electron';
import type { StickyApi } from './types';

const api: StickyApi = {
  getTodayKey: () => ipcRenderer.invoke('date:today'),
  getNote: (noteId) => ipcRenderer.invoke('notes:get', noteId),
  ensureNoteForDate: (dateKey, windowId) => ipcRenderer.invoke('notes:ensure-for-date', dateKey, windowId),
  createNote: (dateKey) => ipcRenderer.invoke('notes:create', dateKey),
  saveNote: (noteId, content) => ipcRenderer.invoke('notes:save', noteId, content),
  listNotesForDate: (dateKey) => ipcRenderer.invoke('notes:list-for-date', dateKey),
  listDates: () => ipcRenderer.invoke('notes:list-dates'),
  getAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top'),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('window:set-always-on-top', value),
  snapToCorner: (windowId, corner) => ipcRenderer.invoke('window:snap-to-corner', windowId, corner),
  windowAction: (action) => ipcRenderer.invoke('window:action', action),
  onNoteChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, note: unknown): void => {
      callback(note as Parameters<typeof callback>[0]);
    };

    ipcRenderer.on('notes:changed', listener);

    return () => ipcRenderer.off('notes:changed', listener);
  }
};

contextBridge.exposeInMainWorld('stickyApi', api);
