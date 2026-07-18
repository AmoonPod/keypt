import { join } from 'node:path'

import { app, BrowserWindow, screen, type WebContents, type WebFrameMain } from 'electron'

import { IPC, type AppSnapshot } from '../shared/contracts'

const PANEL_WIDTH = 600
const PANEL_HEIGHT = 500

export class PanelWindow {
  private window?: BrowserWindow
  private pendingView: 'history' | 'settings' = 'history'

  create(): BrowserWindow {
    const isE2E = !app.isPackaged && process.env.KEYPT_E2E === '1'
    this.window = new BrowserWindow({
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      show: false,
      frame: false,
      transparent: !isE2E,
      backgroundColor: isE2E ? '#101218' : '#00000000',
      hasShadow: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      title: 'Keypt',
      type: process.platform === 'darwin' ? 'panel' : undefined,
      ...(process.platform === 'win32'
        ? { icon: join(app.getAppPath(), 'resources', 'app-icon.png') }
        : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        spellcheck: false,
        devTools: !app.isPackaged && !process.env.KEYPT_DISABLE_DEVTOOLS
      }
    })

    this.window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    this.window.webContents.on('will-navigate', (event) => event.preventDefault())
    this.window.on('blur', () => {
      if (isE2E || this.window?.webContents.isDevToolsOpened()) return
      setTimeout(() => {
        if (this.window && !this.window.isFocused()) this.window.hide()
      }, 80)
    })
    this.window.on('closed', () => {
      this.window = undefined
    })

    if (process.platform === 'darwin') {
      this.window.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true
      })
    }

    const developmentUrl = app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL
    if (developmentUrl) {
      void this.window.loadURL(developmentUrl)
    } else {
      void this.window.loadFile(join(__dirname, '../renderer/index.html'))
    }

    this.window.webContents.on('did-finish-load', () => {
      this.window?.webContents.send(IPC.navigate, this.pendingView)
      if (isE2E) this.show(this.pendingView)
    })

    return this.window
  }

  show(view: 'history' | 'settings' = 'history'): void {
    this.pendingView = view
    if (!this.window || this.window.isDestroyed()) return
    this.position()
    this.window.show()
    this.window.focus()
    this.window.webContents.send(IPC.navigate, view)
  }

  toggle(): void {
    if (this.window?.isVisible()) this.hide()
    else this.show('history')
  }

  hide(): void {
    this.window?.hide()
  }

  sendSnapshot(snapshot: AppSnapshot): void {
    if (!this.window || this.window.isDestroyed() || this.window.webContents.isLoading()) return
    this.window.webContents.send(IPC.snapshot, snapshot)
  }

  owns(webContents: WebContents, frame: WebFrameMain | null): boolean {
    return (
      this.window?.webContents.id === webContents.id && frame === this.window.webContents.mainFrame
    )
  }

  getBrowserWindow(): BrowserWindow | undefined {
    return this.window
  }

  private position(): void {
    if (!this.window) return
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const { x, y, width, height } = display.workArea
    const panelX = Math.round(x + (width - PANEL_WIDTH) / 2)
    const panelY = Math.round(y + Math.max(48, Math.min(120, height * 0.13)))
    this.window.setPosition(panelX, panelY, false)
  }
}
