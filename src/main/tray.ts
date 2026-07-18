import { join } from 'node:path'

import {
  app,
  dialog,
  Menu,
  nativeImage,
  Tray,
  type MenuItemConstructorOptions,
  type MessageBoxOptions
} from 'electron'

import type { AppController } from './app-controller'
import type { PanelWindow } from './panel-window'

export class TrayController {
  private tray?: Tray

  constructor(
    private readonly controller: AppController,
    private readonly panel: PanelWindow
  ) {}

  create(): void {
    const imagePath = join(
      app.getAppPath(),
      'resources',
      process.platform === 'darwin' ? 'trayTemplate.png' : 'tray-win.png'
    )
    const image = nativeImage.createFromPath(imagePath)
    if (process.platform === 'darwin') image.setTemplateImage(true)

    this.tray = new Tray(image)
    this.tray.on('click', () => this.panel.toggle())
    if (process.platform === 'darwin') {
      this.tray.on('right-click', () => this.tray?.popUpContextMenu(this.buildMenu()))
    }
    this.refresh()
  }

  refresh(): void {
    if (!this.tray) return
    const snapshot = this.controller.getSnapshot()
    this.tray.setToolTip(snapshot.paused ? 'Keypt — capture paused' : 'Keypt')
    if (process.platform === 'win32') this.tray.setContextMenu(this.buildMenu())
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = undefined
  }

  private buildMenu(): Menu {
    const snapshot = this.controller.getSnapshot()
    const template: MenuItemConstructorOptions[] = [
      {
        label: 'Open Keypt',
        accelerator: snapshot.settings.shortcut,
        click: () => this.panel.show('history')
      },
      {
        label: snapshot.paused ? 'Resume capture' : 'Pause capture',
        click: () => this.controller.setPaused(!snapshot.paused)
      },
      { type: 'separator' },
      {
        label: 'Launch at login',
        type: 'checkbox',
        checked: snapshot.settings.launchAtStartup,
        click: (menuItem) => {
          void this.controller.updateSettings({ launchAtStartup: menuItem.checked })
        }
      },
      {
        label: 'Settings…',
        click: () => this.panel.show('settings')
      },
      {
        label: 'Clear unpinned history…',
        enabled: snapshot.items.some((item) => !item.pinned),
        click: () => void this.confirmClear()
      },
      { type: 'separator' },
      { label: 'Quit Keypt', role: 'quit' }
    ]
    return Menu.buildFromTemplate(template)
  }

  private async confirmClear(): Promise<void> {
    const options: MessageBoxOptions = {
      type: 'warning',
      title: 'Clear clipboard history?',
      message: 'Clear unpinned clipboard history?',
      detail: 'Pinned items will stay. This cannot be undone.',
      buttons: ['Cancel', 'Clear history'],
      cancelId: 0,
      defaultId: 0,
      noLink: true
    }
    const parent = this.panel.getBrowserWindow()
    const result = parent
      ? await dialog.showMessageBox(parent, options)
      : await dialog.showMessageBox(options)
    if (result.response === 1) await this.controller.clearHistory('unpinned')
  }
}
