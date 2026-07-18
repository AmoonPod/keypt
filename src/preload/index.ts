import { contextBridge, ipcRenderer } from 'electron'

import {
  actionResultSchema,
  activateItemInputSchema,
  appSnapshotSchema,
  clearHistoryInputSchema,
  IPC,
  itemIdInputSchema,
  setPausedInputSchema,
  updateStateSchema,
  updateSettingsInputSchema,
  type KeyptApi
} from '../shared/contracts'

const api: KeyptApi = {
  getSnapshot: async () => appSnapshotSchema.parse(await ipcRenderer.invoke(IPC.getSnapshot)),
  activateItem: async (input) =>
    actionResultSchema.parse(
      await ipcRenderer.invoke(IPC.activateItem, activateItemInputSchema.parse(input))
    ),
  togglePin: async (id) =>
    actionResultSchema.parse(
      await ipcRenderer.invoke(IPC.togglePin, itemIdInputSchema.parse({ id }))
    ),
  deleteItem: async (id) =>
    actionResultSchema.parse(
      await ipcRenderer.invoke(IPC.deleteItem, itemIdInputSchema.parse({ id }))
    ),
  clearHistory: async (scope) =>
    actionResultSchema.parse(
      await ipcRenderer.invoke(IPC.clearHistory, clearHistoryInputSchema.parse({ scope }))
    ),
  updateSettings: async (patch) =>
    actionResultSchema.parse(
      await ipcRenderer.invoke(IPC.updateSettings, updateSettingsInputSchema.parse(patch))
    ),
  setPaused: async (paused) =>
    actionResultSchema.parse(
      await ipcRenderer.invoke(IPC.setPaused, setPausedInputSchema.parse({ paused }))
    ),
  requestPastePermission: async () =>
    actionResultSchema.parse(await ipcRenderer.invoke(IPC.requestPastePermission)),
  openDataFolder: async () =>
    actionResultSchema.parse(await ipcRenderer.invoke(IPC.openDataFolder)),
  checkForUpdates: async () =>
    updateStateSchema.parse(await ipcRenderer.invoke(IPC.checkForUpdates)),
  downloadUpdate: async () => updateStateSchema.parse(await ipcRenderer.invoke(IPC.downloadUpdate)),
  installUpdate: () => ipcRenderer.invoke(IPC.installUpdate),
  hidePanel: () => ipcRenderer.invoke(IPC.hidePanel),
  onSnapshot: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, rawSnapshot: unknown): void => {
      const result = appSnapshotSchema.safeParse(rawSnapshot)
      if (result.success) callback(result.data)
    }
    ipcRenderer.on(IPC.snapshot, listener)
    return () => ipcRenderer.removeListener(IPC.snapshot, listener)
  },
  onNavigate: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, view: unknown): void => {
      if (view === 'history' || view === 'settings') callback(view)
    }
    ipcRenderer.on(IPC.navigate, listener)
    return () => ipcRenderer.removeListener(IPC.navigate, listener)
  }
}

contextBridge.exposeInMainWorld('keypt', api)

declare global {
  interface Window {
    keypt: KeyptApi
  }
}
