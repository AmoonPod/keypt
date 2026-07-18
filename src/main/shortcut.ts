import { app, globalShortcut } from 'electron'

const MODIFIERS = new Set([
  'commandorcontrol',
  'command',
  'cmd',
  'control',
  'ctrl',
  'alt',
  'option',
  'shift',
  'super',
  'meta'
])
const NAMED_KEYS = new Set([
  'space',
  'tab',
  'backspace',
  'delete',
  'insert',
  'home',
  'end',
  'pageup',
  'pagedown',
  'up',
  'down',
  'left',
  'right'
])

function isEndToEnd(): boolean {
  return !app.isPackaged && process.env.KEYPT_E2E === '1'
}

export function isSafeAccelerator(accelerator: string): boolean {
  const parts = accelerator.split('+').map((part) => part.trim())
  if (parts.length < 2 || parts.some((part) => !part)) return false

  const key = parts.at(-1)?.toLocaleLowerCase() ?? ''
  const modifiers = parts.slice(0, -1).map((part) => part.toLocaleLowerCase())
  const validKey =
    /^[a-z0-9]$/.test(key) || /^f(?:[1-9]|1\d|2[0-4])$/.test(key) || NAMED_KEYS.has(key)
  return validKey && modifiers.every((modifier) => MODIFIERS.has(modifier))
}

export class ShortcutManager {
  private current?: string

  constructor(private readonly callback: () => void) {}

  register(accelerator: string): boolean {
    if (!isSafeAccelerator(accelerator)) return false
    if (isEndToEnd()) {
      this.current = accelerator
      return true
    }

    const previous = this.current
    if (previous) globalShortcut.unregister(previous)

    const registered = globalShortcut.register(accelerator, this.callback)
    if (registered) {
      this.current = accelerator
      return true
    }

    if (previous && globalShortcut.register(previous, this.callback)) this.current = previous
    else this.current = undefined
    return false
  }

  isRegistered(): boolean {
    if (isEndToEnd()) return Boolean(this.current)
    return Boolean(this.current && globalShortcut.isRegistered(this.current))
  }

  dispose(): void {
    if (this.current && !isEndToEnd()) globalShortcut.unregister(this.current)
    this.current = undefined
  }
}
