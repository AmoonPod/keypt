import { join } from 'node:path'

import { app, dialog, powerMonitor, session, type Event, type WebContents } from 'electron'

import { AppController } from './app-controller'
import { ClipboardMonitor } from './clipboard/monitor'
import { registerIpc } from './ipc'
import { PanelWindow } from './panel-window'
import { SettingsStore } from './settings'
import { ShortcutManager } from './shortcut'
import { getOrCreateMasterKey } from './storage/key-store'
import { HistoryRepository } from './storage/history-repository'
import { TrayController } from './tray'
import { UpdateManager } from './updater'

let panel: PanelWindow | undefined
let disposeApplication: (() => void) | undefined

app.enableSandbox()

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) app.quit()

app.setName('Keypt')
if (process.platform === 'win32') app.setAppUserModelId('io.github.amoonpod.keypt')

function hardenWebContents(contents: WebContents): void {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  contents.on('will-navigate', (event: Event) => event.preventDefault())
}

function configureSessionSecurity(): void {
  const strictCsp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'none'",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'"
  ].join('; ')

  session.defaultSession.setPermissionCheckHandler(() => false)
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false)
  )

  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [strictCsp]
        }
      })
    })
  }
}

async function seedEndToEndHistory(
  history: HistoryRepository,
  settings: ReturnType<SettingsStore['get']>
): Promise<void> {
  if (app.isPackaged || process.env.KEYPT_E2E_SEED !== '1' || history.list().length > 0) return

  const code = await history.add(
    {
      kind: 'code',
      payload: Buffer.from("const localOnly = true\nconsole.log('Keypt')", 'utf8'),
      sourceApp: 'Visual Studio Code',
      copiedAt: Date.now() - 60_000
    },
    settings
  )
  await history.togglePin(code.id)
  await history.add(
    {
      kind: 'link',
      payload: Buffer.from('https://github.com/electron/electron', 'utf8'),
      sourceApp: 'Safari',
      copiedAt: Date.now() - 240_000
    },
    settings
  )
  await history.add(
    {
      kind: 'color',
      payload: Buffer.from('#5B72D6', 'utf8'),
      colorValue: '#5B72D6',
      sourceApp: 'Figma',
      copiedAt: Date.now() - 600_000
    },
    settings
  )
  await history.add(
    {
      kind: 'text',
      payload: Buffer.from('Everything stays on this device.', 'utf8'),
      sourceApp: 'Notes',
      copiedAt: Date.now() - 900_000
    },
    settings
  )
}

async function initialize(): Promise<void> {
  const isEndToEnd = !app.isPackaged && process.env.KEYPT_E2E === '1'
  configureSessionSecurity()
  app.on('web-contents-created', (_event, contents) => hardenWebContents(contents))

  if (process.platform === 'darwin') app.dock?.hide()

  const dataDirectory = join(app.getPath('userData'), 'vault')
  const settingsStore = new SettingsStore(dataDirectory)
  await settingsStore.load()

  const masterKey = await getOrCreateMasterKey(dataDirectory)
  const history = new HistoryRepository(dataDirectory, masterKey)
  await history.initialize()
  await history.cleanup(settingsStore.get())
  await seedEndToEndHistory(history, settingsStore.get())

  panel = new PanelWindow()
  panel.create()

  const controllerRef: { current?: AppController } = {}
  const monitor = new ClipboardMonitor(
    history,
    () => settingsStore.get(),
    () => controllerRef.current?.broadcast()
  )
  const shortcuts = new ShortcutManager(() => panel?.toggle())
  const updates = new UpdateManager(() => controllerRef.current?.broadcast())
  const controller = new AppController(
    dataDirectory,
    history,
    settingsStore,
    monitor,
    shortcuts,
    panel,
    updates
  )
  controllerRef.current = controller

  shortcuts.register(settingsStore.get().shortcut)
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: settingsStore.get().launchAtStartup })
  }

  const removeIpc = registerIpc(controller, panel)
  updates.start()
  const tray = isEndToEnd ? undefined : new TrayController(controller, panel)
  tray?.create()
  const removeTrayListener = controller.onStateChange(() => tray?.refresh())

  if (!isEndToEnd) {
    monitor.start()
    powerMonitor.on('lock-screen', () => monitor.stop())
    powerMonitor.on('suspend', () => monitor.stop())
    powerMonitor.on('unlock-screen', () => monitor.start(true))
    powerMonitor.on('resume', () => monitor.start(true))
  }

  const cleanupTimer = setInterval(
    () => {
      void history.cleanup(settingsStore.get()).then((changed) => {
        if (changed) controller.broadcast()
      })
    },
    30 * 60 * 1000
  )
  cleanupTimer.unref()

  if (isEndToEnd) panel.show('history')

  disposeApplication = () => {
    clearInterval(cleanupTimer)
    removeTrayListener()
    removeIpc()
    monitor.stop()
    updates.dispose()
    shortcuts.dispose()
    tray?.destroy()
  }
}

if (hasSingleInstanceLock) {
  app.on('second-instance', () => panel?.show('history'))
  app.on('activate', () => panel?.show('history'))
  app.on('window-all-closed', () => {
    // Tray applications stay alive until the explicit Quit command.
  })
  app.on('before-quit', () => {
    disposeApplication?.()
  })

  void app
    .whenReady()
    .then(initialize)
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'An unknown startup error occurred.'
      dialog.showErrorBox('Keypt could not start', message)
      app.quit()
    })
}
