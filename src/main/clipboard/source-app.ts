import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface SourceApp {
  name: string
  id?: string
  path?: string
}

const UNKNOWN_APP: SourceApp = { name: 'Unknown app' }

function matchQuotedValue(output: string, key: string): string | undefined {
  const match = output.match(new RegExp(`"${key}"="([^"]+)"`))
  return match?.[1]
}

async function getMacSourceApp(): Promise<SourceApp> {
  const { stdout: frontOutput } = await execFileAsync('/usr/bin/lsappinfo', ['front'], {
    timeout: 1000,
    encoding: 'utf8'
  })
  const asn = frontOutput.trim()
  if (!asn.startsWith('ASN:')) return UNKNOWN_APP

  const { stdout } = await execFileAsync(
    '/usr/bin/lsappinfo',
    ['info', '-only', 'name,bundleid,path', asn],
    { timeout: 1000, encoding: 'utf8' }
  )

  return {
    name: matchQuotedValue(stdout, 'LSDisplayName') ?? 'Unknown app',
    id: matchQuotedValue(stdout, 'CFBundleIdentifier'),
    path: matchQuotedValue(stdout, 'path')
  }
}

const WINDOWS_SOURCE_SCRIPT = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class KeyptForeground {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@
$window = [KeyptForeground]::GetForegroundWindow()
$processId = [uint32]0
[void][KeyptForeground]::GetWindowThreadProcessId($window, [ref]$processId)
$process = Get-Process -Id $processId -ErrorAction Stop
$description = $process.MainModule.FileVersionInfo.FileDescription
if ([string]::IsNullOrWhiteSpace($description)) { $description = $process.ProcessName }
[PSCustomObject]@{ name = $description; id = $process.ProcessName; path = $process.Path } | ConvertTo-Json -Compress
`.trim()

async function getWindowsSourceApp(): Promise<SourceApp> {
  const windowsRoot = process.env.SystemRoot ?? 'C:\\Windows'
  const powershellPath = `${windowsRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
  const { stdout } = await execFileAsync(
    powershellPath,
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-WindowStyle',
      'Hidden',
      '-Command',
      WINDOWS_SOURCE_SCRIPT
    ],
    { timeout: 2500, encoding: 'utf8', windowsHide: true }
  )
  const parsed = JSON.parse(stdout.trim()) as Partial<SourceApp>
  return {
    name: parsed.name?.trim() || 'Unknown app',
    id: parsed.id,
    path: parsed.path
  }
}

export async function getSourceApp(): Promise<SourceApp> {
  try {
    if (process.platform === 'darwin') return await getMacSourceApp()
    if (process.platform === 'win32') return await getWindowsSourceApp()
    return UNKNOWN_APP
  } catch {
    return UNKNOWN_APP
  }
}

export function isExcludedSource(source: SourceApp, excludedApps: readonly string[]): boolean {
  const sourceText = `${source.name} ${source.id ?? ''} ${source.path ?? ''}`.toLocaleLowerCase()
  if (sourceText.includes('keypt')) return true
  return excludedApps.some((app) => sourceText.includes(app.trim().toLocaleLowerCase()))
}
