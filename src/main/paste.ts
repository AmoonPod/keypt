import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { app, systemPreferences } from 'electron'

const execFileAsync = promisify(execFile)

export type PastePermission = 'granted' | 'required' | 'unavailable'

function isEndToEnd(): boolean {
  return !app.isPackaged && process.env.KEYPT_E2E === '1'
}

export function getPastePermission(): PastePermission {
  if (isEndToEnd()) return 'unavailable'
  if (process.platform === 'win32') return 'granted'
  if (process.platform === 'darwin') {
    return systemPreferences.isTrustedAccessibilityClient(false) ? 'granted' : 'required'
  }
  return 'unavailable'
}

export function requestPastePermission(): PastePermission {
  if (process.platform !== 'darwin' || isEndToEnd()) {
    return getPastePermission()
  }
  return systemPreferences.isTrustedAccessibilityClient(true) ? 'granted' : 'required'
}

export async function sendPasteKeystroke(): Promise<void> {
  if (process.platform === 'darwin') {
    await execFileAsync(
      '/usr/bin/osascript',
      ['-e', 'tell application "System Events" to keystroke "v" using command down'],
      { timeout: 2500, windowsHide: true }
    )
    return
  }

  if (process.platform === 'win32') {
    const windowsRoot = process.env.SystemRoot ?? 'C:\\Windows'
    const powershellPath = `${windowsRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    await execFileAsync(
      powershellPath,
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-WindowStyle',
        'Hidden',
        '-Command',
        "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"
      ],
      { timeout: 2500, windowsHide: true }
    )
    return
  }

  throw new Error('Automatic paste is not available on this platform.')
}
