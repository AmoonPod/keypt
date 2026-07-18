import { app, clipboard, nativeImage, shell } from 'electron'

import {
  appSettingsSchema,
  type ActionResult,
  type ActivateItemInput,
  type AppSettings,
  type AppSnapshot,
  type ClearHistoryInput,
  type UpdateState,
  type UpdateSettingsInput
} from '../shared/contracts'
import { ClipboardMonitor } from './clipboard/monitor'
import { getPastePermission, requestPastePermission, sendPasteKeystroke } from './paste'
import type { PanelWindow } from './panel-window'
import type { SettingsStore } from './settings'
import type { ShortcutManager } from './shortcut'
import type { HistoryRepository } from './storage/history-repository'
import type { UpdateManager } from './updater'

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

function platformName(): AppSnapshot['platform'] {
  if (process.platform === 'darwin' || process.platform === 'win32') return process.platform
  return 'other'
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Keypt could not complete that action.'
}

export class AppController {
  private listeners = new Set<() => void>()

  constructor(
    private readonly dataDirectory: string,
    private readonly history: HistoryRepository,
    private readonly settingsStore: SettingsStore,
    private readonly monitor: ClipboardMonitor,
    private readonly shortcuts: ShortcutManager,
    private readonly panel: PanelWindow,
    private readonly updates: UpdateManager
  ) {}

  getSettings(): AppSettings {
    return this.settingsStore.get()
  }

  getSnapshot(): AppSnapshot {
    return {
      items: this.history.list(),
      settings: this.settingsStore.get(),
      appVersion: app.getVersion(),
      update: this.updates.state,
      platform: platformName(),
      paused: this.monitor.isPaused(),
      shortcutRegistered: this.shortcuts.isRegistered(),
      secureStorage: true,
      pastePermission: getPastePermission(),
      warning: this.history.getWarning()
    }
  }

  onStateChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  broadcast(): void {
    const snapshot = this.getSnapshot()
    this.panel.sendSnapshot(snapshot)
    this.listeners.forEach((listener) => listener())
  }

  async activateItem(input: ActivateItemInput): Promise<ActionResult> {
    try {
      const payload = await this.history.getPayload(input.id)
      if (!payload) return { ok: false, message: 'That clipboard item no longer exists.' }

      if (payload.item.kind === 'image') {
        const image = nativeImage.createFromBuffer(payload.data)
        if (image.isEmpty()) return { ok: false, message: 'That image could not be restored.' }
        clipboard.writeImage(image)
      } else {
        clipboard.writeText(payload.data.toString('utf8'))
      }

      this.monitor.suppress(payload.data)
      await this.history.touch(input.id)
      this.broadcast()

      if (input.action === 'copy') {
        this.panel.hide()
        return { ok: true, snapshot: this.getSnapshot() }
      }

      const permission = getPastePermission()
      if (permission !== 'granted') {
        return {
          ok: true,
          message:
            permission === 'required'
              ? 'Copied. Allow Accessibility in Settings to paste automatically.'
              : 'Copied. Automatic paste is unavailable on this platform.',
          snapshot: this.getSnapshot()
        }
      }

      this.panel.hide()
      await wait(process.platform === 'win32' ? 140 : 90)

      try {
        await sendPasteKeystroke()
      } catch (error) {
        this.panel.show('history')
        return {
          ok: false,
          message: `Copied, but automatic paste failed. ${errorMessage(error)}`,
          snapshot: this.getSnapshot()
        }
      }

      return { ok: true, snapshot: this.getSnapshot() }
    } catch (error) {
      return { ok: false, message: errorMessage(error), snapshot: this.getSnapshot() }
    }
  }

  async togglePin(id: string): Promise<ActionResult> {
    try {
      await this.history.togglePin(id)
      this.broadcast()
      return { ok: true, snapshot: this.getSnapshot() }
    } catch (error) {
      return { ok: false, message: errorMessage(error) }
    }
  }

  async deleteItem(id: string): Promise<ActionResult> {
    try {
      await this.history.delete(id)
      this.broadcast()
      return { ok: true, snapshot: this.getSnapshot() }
    } catch (error) {
      return { ok: false, message: errorMessage(error) }
    }
  }

  async clearHistory(scope: ClearHistoryInput['scope']): Promise<ActionResult> {
    try {
      await this.history.clear(scope)
      this.broadcast()
      return { ok: true, snapshot: this.getSnapshot() }
    } catch (error) {
      return { ok: false, message: errorMessage(error) }
    }
  }

  async updateSettings(patch: UpdateSettingsInput): Promise<ActionResult> {
    const previous = this.settingsStore.get()

    try {
      const proposed = appSettingsSchema.parse({ ...previous, ...patch })
      if (proposed.shortcut !== previous.shortcut && !this.shortcuts.register(proposed.shortcut)) {
        return {
          ok: false,
          message: 'That shortcut is unavailable. Keypt kept the previous shortcut.',
          snapshot: this.getSnapshot()
        }
      }

      await this.settingsStore.update(patch)
      if (proposed.launchAtStartup !== previous.launchAtStartup && app.isPackaged) {
        app.setLoginItemSettings({ openAtLogin: proposed.launchAtStartup })
      }

      await this.history.cleanup(proposed)
      this.broadcast()
      return { ok: true, snapshot: this.getSnapshot() }
    } catch (error) {
      if (patch.shortcut && patch.shortcut !== previous.shortcut) {
        this.shortcuts.register(previous.shortcut)
      }
      return { ok: false, message: errorMessage(error), snapshot: this.getSnapshot() }
    }
  }

  setPaused(paused: boolean): ActionResult {
    this.monitor.setPaused(paused)
    this.broadcast()
    return { ok: true, snapshot: this.getSnapshot() }
  }

  requestPastePermission(): ActionResult {
    requestPastePermission()
    this.broadcast()
    return { ok: true, snapshot: this.getSnapshot() }
  }

  async openDataFolder(): Promise<ActionResult> {
    const result = await shell.openPath(this.dataDirectory)
    return result ? { ok: false, message: result } : { ok: true }
  }

  checkForUpdates(): Promise<UpdateState> {
    return this.updates.check()
  }

  downloadUpdate(): Promise<UpdateState> {
    return this.updates.download()
  }

  installUpdate(): void {
    this.updates.install()
  }
}
