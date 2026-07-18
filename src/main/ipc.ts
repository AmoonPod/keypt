import { ipcMain, type IpcMainInvokeEvent } from 'electron'

import {
  activateItemInputSchema,
  clearHistoryInputSchema,
  IPC,
  itemIdInputSchema,
  setPausedInputSchema,
  updateSettingsInputSchema,
  type ActionResult
} from '../shared/contracts'
import type { AppController } from './app-controller'
import type { PanelWindow } from './panel-window'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Invalid request.'
}

export function registerIpc(controller: AppController, panel: PanelWindow): () => void {
  const trusted = (event: IpcMainInvokeEvent): void => {
    if (!panel.owns(event.sender, event.senderFrame)) {
      throw new Error('Rejected IPC from an untrusted renderer.')
    }
  }

  ipcMain.handle(IPC.getSnapshot, (event) => {
    trusted(event)
    return controller.getSnapshot()
  })

  ipcMain.handle(IPC.activateItem, async (event, rawInput: unknown): Promise<ActionResult> => {
    try {
      trusted(event)
      return await controller.activateItem(activateItemInputSchema.parse(rawInput))
    } catch (error) {
      return { ok: false, message: errorMessage(error) }
    }
  })

  ipcMain.handle(IPC.togglePin, async (event, rawInput: unknown): Promise<ActionResult> => {
    try {
      trusted(event)
      return await controller.togglePin(itemIdInputSchema.parse(rawInput).id)
    } catch (error) {
      return { ok: false, message: errorMessage(error) }
    }
  })

  ipcMain.handle(IPC.deleteItem, async (event, rawInput: unknown): Promise<ActionResult> => {
    try {
      trusted(event)
      return await controller.deleteItem(itemIdInputSchema.parse(rawInput).id)
    } catch (error) {
      return { ok: false, message: errorMessage(error) }
    }
  })

  ipcMain.handle(IPC.clearHistory, async (event, rawInput: unknown): Promise<ActionResult> => {
    try {
      trusted(event)
      return await controller.clearHistory(clearHistoryInputSchema.parse(rawInput).scope)
    } catch (error) {
      return { ok: false, message: errorMessage(error) }
    }
  })

  ipcMain.handle(IPC.updateSettings, async (event, rawInput: unknown): Promise<ActionResult> => {
    try {
      trusted(event)
      return await controller.updateSettings(updateSettingsInputSchema.parse(rawInput))
    } catch (error) {
      return { ok: false, message: errorMessage(error) }
    }
  })

  ipcMain.handle(IPC.setPaused, (event, rawInput: unknown): ActionResult => {
    try {
      trusted(event)
      return controller.setPaused(setPausedInputSchema.parse(rawInput).paused)
    } catch (error) {
      return { ok: false, message: errorMessage(error) }
    }
  })

  ipcMain.handle(IPC.requestPastePermission, (event): ActionResult => {
    try {
      trusted(event)
      return controller.requestPastePermission()
    } catch (error) {
      return { ok: false, message: errorMessage(error) }
    }
  })

  ipcMain.handle(IPC.openDataFolder, async (event): Promise<ActionResult> => {
    try {
      trusted(event)
      return await controller.openDataFolder()
    } catch (error) {
      return { ok: false, message: errorMessage(error) }
    }
  })

  ipcMain.handle(IPC.checkForUpdates, async (event) => {
    trusted(event)
    return controller.checkForUpdates()
  })

  ipcMain.handle(IPC.downloadUpdate, async (event) => {
    trusted(event)
    return controller.downloadUpdate()
  })

  ipcMain.handle(IPC.installUpdate, (event) => {
    trusted(event)
    controller.installUpdate()
  })

  ipcMain.handle(IPC.hidePanel, (event) => {
    trusted(event)
    panel.hide()
  })

  return () => Object.values(IPC).forEach((channel) => ipcMain.removeHandler(channel))
}
