import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  FolderOpen,
  LockKeyhole,
  Plus,
  RefreshCw,
  X
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type {
  AppSnapshot,
  CleanupDays,
  EnterAction,
  ThemePreference,
  UpdateState,
  UpdateSettingsInput
} from '../../../shared/contracts'

interface SettingsViewProps {
  snapshot: AppSnapshot
  onBack: () => void
  onUpdate: (patch: UpdateSettingsInput) => Promise<void>
  onSetPaused: (paused: boolean) => Promise<void>
  onClear: (scope: 'unpinned' | 'all') => Promise<void>
  onRequestPastePermission: () => Promise<void>
  onOpenDataFolder: () => Promise<void>
  onCheckForUpdates: () => Promise<void>
  onDownloadUpdate: () => Promise<void>
  onInstallUpdate: () => Promise<void>
}

interface ToggleProps {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}

function Toggle({ checked, label, onChange }: ToggleProps): React.JSX.Element {
  return (
    <button
      className={`toggle${checked ? ' is-on' : ''}`}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  )
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange
}: SegmentedProps<T>): React.JSX.Element {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? 'is-active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function formatShortcut(accelerator: string, platform: AppSnapshot['platform']): string {
  const tokens = accelerator.split('+')
  if (platform === 'darwin') {
    const symbols: Record<string, string> = {
      CommandOrControl: '⌘',
      Command: '⌘',
      Cmd: '⌘',
      Control: '⌃',
      Ctrl: '⌃',
      Alt: '⌥',
      Option: '⌥',
      Shift: '⇧',
      Backspace: '⌫',
      Delete: '⌦',
      Space: 'Space'
    }
    return tokens.map((token) => symbols[token] ?? token.toUpperCase()).join('')
  }

  const labels: Record<string, string> = {
    CommandOrControl: 'Ctrl',
    Command: 'Win',
    Cmd: 'Win',
    Control: 'Ctrl',
    Ctrl: 'Ctrl',
    Alt: 'Alt',
    Option: 'Alt',
    Shift: 'Shift'
  }
  return tokens.map((token) => labels[token] ?? token.toUpperCase()).join(' + ')
}

function acceleratorKey(key: string): string | undefined {
  if (key.length === 1 && /[a-z0-9]/i.test(key)) return key.toUpperCase()
  if (/^F(?:[1-9]|1\d|2[0-4])$/i.test(key)) return key.toUpperCase()
  const names: Record<string, string> = {
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Home: 'Home',
    End: 'End',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Tab: 'Tab'
  }
  return names[key]
}

interface ShortcutRecorderProps {
  value: string
  platform: AppSnapshot['platform']
  onChange: (value: string) => void
}

function ShortcutRecorder({ value, platform, onChange }: ShortcutRecorderProps): React.JSX.Element {
  const [recording, setRecording] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (recording) buttonRef.current?.focus()
  }, [recording])

  return (
    <button
      ref={buttonRef}
      className={`shortcut-recorder${recording ? ' is-recording' : ''}`}
      type="button"
      aria-label="Record global shortcut"
      onClick={() => setRecording(true)}
      onBlur={() => setRecording(false)}
      onKeyDown={(event) => {
        if (!recording) return
        event.preventDefault()
        event.stopPropagation()
        if (event.key === 'Escape') {
          setRecording(false)
          return
        }

        const key = acceleratorKey(event.key)
        if (!key) return
        const modifiers: string[] = []
        if (event.metaKey) modifiers.push(platform === 'darwin' ? 'Command' : 'Super')
        if (event.ctrlKey) modifiers.push('Control')
        if (event.altKey) modifiers.push(platform === 'darwin' ? 'Option' : 'Alt')
        if (event.shiftKey) modifiers.push('Shift')
        if (!modifiers.length) return

        onChange([...modifiers, key].join('+'))
        setRecording(false)
      }}
    >
      {recording ? 'Press shortcut…' : formatShortcut(value, platform)}
    </button>
  )
}

export function SettingsView({
  snapshot,
  onBack,
  onUpdate,
  onSetPaused,
  onClear,
  onRequestPastePermission,
  onOpenDataFolder,
  onCheckForUpdates,
  onDownloadUpdate,
  onInstallUpdate
}: SettingsViewProps): React.JSX.Element {
  const [excludedApp, setExcludedApp] = useState('')
  const [confirmClear, setConfirmClear] = useState<'unpinned' | 'all' | null>(null)
  const settings = snapshot.settings

  const addExcludedApp = (): void => {
    const value = excludedApp.trim()
    if (!value || settings.excludedApps.some((app) => app.toLowerCase() === value.toLowerCase()))
      return
    void onUpdate({ excludedApps: [...settings.excludedApps, value] })
    setExcludedApp('')
  }

  return (
    <>
      <header className="settings-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Back to history">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <h1>Settings</h1>
        <span className="settings-version">v{snapshot.appVersion}</span>
      </header>

      <main className="settings-content">
        {!snapshot.shortcutRegistered ? (
          <div className="setting-alert" role="alert">
            The global shortcut is in use by another app. Record a different one below.
          </div>
        ) : null}

        <section className="settings-section" aria-labelledby="appearance-heading">
          <h2 id="appearance-heading">Appearance</h2>
          <div className="setting-row">
            <div className="setting-copy">
              <span className="setting-label">Theme</span>
              <span className="setting-description">
                Follow the desktop or choose a fixed theme.
              </span>
            </div>
            <Segmented<ThemePreference>
              label="Theme"
              value={settings.theme}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' }
              ]}
              onChange={(theme) => void onUpdate({ theme })}
            />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <span className="setting-label">Launch at login</span>
              <span className="setting-description">Keep Keypt ready in the menu bar or tray.</span>
            </div>
            <Toggle
              label="Launch at login"
              checked={settings.launchAtStartup}
              onChange={(launchAtStartup) => void onUpdate({ launchAtStartup })}
            />
          </div>
        </section>

        <section className="settings-section" aria-labelledby="behavior-heading">
          <h2 id="behavior-heading">Behavior</h2>
          <div className="setting-row">
            <div className="setting-copy">
              <span className="setting-label">Open Keypt</span>
              <span className="setting-description">Click, then press a new key combination.</span>
            </div>
            <ShortcutRecorder
              value={settings.shortcut}
              platform={snapshot.platform}
              onChange={(shortcut) => void onUpdate({ shortcut })}
            />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <span className="setting-label">Enter key</span>
              <span className="setting-description">
                Choose the default action for a selected item.
              </span>
            </div>
            <Segmented<EnterAction>
              label="Enter key action"
              value={settings.enterAction}
              options={[
                { value: 'paste', label: 'Paste' },
                { value: 'copy', label: 'Copy only' }
              ]}
              onChange={(enterAction) => void onUpdate({ enterAction })}
            />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <label className="setting-label" htmlFor="history-limit">
                History limit
              </label>
              <span className="setting-description">
                Pinned items do not count toward the limit.
              </span>
            </div>
            <div className="select-wrap">
              <select
                id="history-limit"
                value={settings.historyLimit}
                onChange={(event) => void onUpdate({ historyLimit: Number(event.target.value) })}
              >
                {[50, 100, 200, 500, 1000].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit} items
                  </option>
                ))}
              </select>
              <ChevronDown size={13} aria-hidden="true" />
            </div>
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <label className="setting-label" htmlFor="cleanup-days">
                Automatic cleanup
              </label>
              <span className="setting-description">
                Pinned items are kept until you delete them.
              </span>
            </div>
            <div className="select-wrap">
              <select
                id="cleanup-days"
                value={settings.cleanupDays}
                onChange={(event) =>
                  void onUpdate({ cleanupDays: Number(event.target.value) as CleanupDays })
                }
              >
                <option value={1}>After 1 day</option>
                <option value={7}>After 7 days</option>
                <option value={30}>After 30 days</option>
                <option value={90}>After 90 days</option>
                <option value={0}>Never</option>
              </select>
              <ChevronDown size={13} aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="privacy-heading">
          <h2 id="privacy-heading">Privacy</h2>
          <div className="setting-row">
            <div className="setting-copy">
              <span className="setting-label">Pause capture</span>
              <span className="setting-description">Resume from here or the tray menu.</span>
            </div>
            <Toggle
              label="Pause clipboard capture"
              checked={snapshot.paused}
              onChange={(paused) => void onSetPaused(paused)}
            />
          </div>
          {snapshot.platform === 'darwin' ? (
            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">Automatic paste</span>
                <span className="setting-description">
                  macOS Accessibility access is used only to send ⌘V.
                </span>
              </div>
              {snapshot.pastePermission === 'granted' ? (
                <span className="permission-state">
                  <Check size={13} /> Ready
                </span>
              ) : (
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => void onRequestPastePermission()}
                >
                  Allow…
                </button>
              )}
            </div>
          ) : null}
          <div className="setting-row setting-row--column">
            <div className="setting-copy">
              <span className="setting-label">Excluded apps</span>
              <span className="setting-description">
                Changes detected while these apps are frontmost are not saved.
              </span>
            </div>
            <div className="excluded-apps" aria-label="Excluded applications">
              {settings.excludedApps.map((app) => (
                <span className="app-chip" key={app}>
                  {app}
                  <button
                    type="button"
                    aria-label={`Remove ${app}`}
                    onClick={() =>
                      void onUpdate({
                        excludedApps: settings.excludedApps.filter((item) => item !== app)
                      })
                    }
                  >
                    <X size={11} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
            <div className="add-app-row">
              <input
                value={excludedApp}
                onChange={(event) => setExcludedApp(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') addExcludedApp()
                }}
                placeholder="Application name"
                aria-label="Application name to exclude"
              />
              <button
                className="button-secondary"
                type="button"
                onClick={addExcludedApp}
                disabled={!excludedApp.trim()}
              >
                <Plus size={13} aria-hidden="true" /> Add
              </button>
            </div>
            <p className="privacy-note">
              Concealed and transient clipboard formats are skipped. Browsers do not reveal whether
              text came from a password field; exclude the browser when that distinction matters.
            </p>
          </div>
          <div className="setting-row">
            <div className="setting-copy setting-copy--with-icon">
              <LockKeyhole size={15} aria-hidden="true" />
              <div>
                <span className="setting-label">Encrypted on this device</span>
                <span className="setting-description">
                  No account, network sync, analytics, or telemetry.
                </span>
              </div>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => void onOpenDataFolder()}
              aria-label="Open data folder"
              title="Open data folder"
            >
              <FolderOpen size={17} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="updates-heading">
          <h2 id="updates-heading">Updates</h2>
          <UpdateRow
            state={snapshot.update}
            onCheck={onCheckForUpdates}
            onDownload={onDownloadUpdate}
            onInstall={onInstallUpdate}
          />
        </section>

        <section className="settings-section settings-section--data" aria-labelledby="data-heading">
          <h2 id="data-heading">Data</h2>
          {confirmClear ? (
            <div className="clear-confirm" role="alert">
              <div>
                <span className="setting-label">
                  {confirmClear === 'all'
                    ? 'Delete every clipboard item?'
                    : 'Clear unpinned history?'}
                </span>
                <span className="setting-description">This cannot be undone.</span>
              </div>
              <div className="confirm-actions">
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => setConfirmClear(null)}
                >
                  Cancel
                </button>
                <button
                  className="button-danger"
                  type="button"
                  onClick={() => {
                    void onClear(confirmClear)
                    setConfirmClear(null)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="data-actions">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setConfirmClear('unpinned')}
              >
                Clear unpinned
              </button>
              <button
                className="button-text-danger"
                type="button"
                onClick={() => setConfirmClear('all')}
              >
                Delete all history…
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  )
}

interface UpdateRowProps {
  state: UpdateState
  onCheck: () => Promise<void>
  onDownload: () => Promise<void>
  onInstall: () => Promise<void>
}

function UpdateRow({ state, onCheck, onDownload, onInstall }: UpdateRowProps): React.JSX.Element {
  const version = state.availableVersion ? `v${state.availableVersion}` : 'the latest version'
  const description = (() => {
    switch (state.phase) {
      case 'checking':
        return 'Checking the official GitHub release channel…'
      case 'up-to-date':
        return 'You are running the latest available release.'
      case 'available':
        return `${version} is ready to download.`
      case 'downloading':
        return `Downloading ${version} · ${state.progressPercent ?? 0}%`
      case 'downloaded':
        return `${version} is ready. Restart to finish.`
      case 'error':
        return state.message ?? 'The update check could not be completed.'
      case 'disabled':
        return state.message ?? 'Updates are available in packaged release builds.'
      default:
        return 'Updates are verified and delivered from GitHub Releases.'
    }
  })()

  return (
    <div className={`setting-row update-row update-row--${state.phase}`} role="status">
      <div className="setting-copy">
        <span className="setting-label">Software update</span>
        <span className="setting-description">{description}</span>
      </div>
      {state.phase === 'available' ? (
        <button className="button-primary" type="button" onClick={() => void onDownload()}>
          <Download size={13} aria-hidden="true" /> Download
        </button>
      ) : state.phase === 'downloaded' ? (
        <button className="button-primary" type="button" onClick={() => void onInstall()}>
          <RefreshCw size={13} aria-hidden="true" /> Restart
        </button>
      ) : state.phase !== 'disabled' ? (
        <button
          className="button-secondary"
          type="button"
          disabled={state.phase === 'checking' || state.phase === 'downloading'}
          onClick={() => void onCheck()}
        >
          {state.phase === 'downloading' ? `${state.progressPercent ?? 0}%` : 'Check'}
        </button>
      ) : null}
    </div>
  )
}
