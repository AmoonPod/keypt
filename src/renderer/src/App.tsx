import { AlertCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  ActionResult,
  AppSnapshot,
  KeyptApi,
  EnterAction,
  UpdateSettingsInput
} from '../../shared/contracts'
import { searchClipboardItems } from '../../shared/search'
import { HistoryView } from './components/HistoryView'
import { SettingsView } from './components/SettingsView'

let api: KeyptApi | undefined = window.keypt
const INITIAL_NOW = Date.now()

async function resolveApi(): Promise<KeyptApi | undefined> {
  if (api || !import.meta.env.DEV) return api
  const { createDemoApi } = await import('./demo-api')
  api = createDemoApi()
  return api
}

function applyTheme(snapshot: AppSnapshot): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const update = (): void => {
    const resolved =
      snapshot.settings.theme === 'system'
        ? media.matches
          ? 'dark'
          : 'light'
        : snapshot.settings.theme
    document.documentElement.dataset.theme = snapshot.settings.theme
    document.documentElement.dataset.resolvedTheme = resolved
  }
  update()
  media.addEventListener('change', update)
  return () => media.removeEventListener('change', update)
}

function LoadingPanel(): React.JSX.Element {
  return (
    <div className="loading-panel" aria-label="Loading clipboard history">
      <div className="loading-search" />
      <div className="loading-lines">
        {[0, 1, 2, 3, 4].map((line) => (
          <span key={line} />
        ))}
      </div>
    </div>
  )
}

export function App(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null)
  const [view, setView] = useState<'history' | 'settings'>('history')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const [toast, setToast] = useState<string>()
  const [loadError, setLoadError] = useState<string>()
  const [now, setNow] = useState(INITIAL_NOW)
  const busy = useRef(false)
  const clearArmedUntil = useRef(0)

  useEffect(() => {
    let mounted = true
    let removeSnapshotListener: (() => void) | undefined
    let removeNavigateListener: (() => void) | undefined
    void resolveApi()
      .then(async (resolvedApi) => {
        if (!resolvedApi) throw new Error('The secure Keypt bridge did not load.')
        if (!mounted) return
        removeSnapshotListener = resolvedApi.onSnapshot(setSnapshot)
        removeNavigateListener = resolvedApi.onNavigate((nextView) => {
          setView(nextView)
          if (nextView === 'history') setQuery('')
        })
        const value = await resolvedApi.getSnapshot()
        if (mounted) setSnapshot(value)
      })
      .catch((error: unknown) => {
        if (mounted) setLoadError(error instanceof Error ? error.message : 'Keypt could not load.')
      })
    const timeTimer = window.setInterval(() => setNow(Date.now()), 30_000)

    return () => {
      mounted = false
      removeSnapshotListener?.()
      removeNavigateListener?.()
      window.clearInterval(timeTimer)
    }
  }, [])

  useEffect(() => {
    if (!snapshot) return
    return applyTheme(snapshot)
  }, [snapshot])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(undefined), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const filteredItems = useMemo(
    () => (snapshot ? searchClipboardItems(snapshot.items, query) : []),
    [snapshot, query]
  )
  const effectiveSelectedId = filteredItems.some((item) => item.id === selectedId)
    ? selectedId
    : filteredItems[0]?.id

  const handleResult = useCallback((result: ActionResult): void => {
    if (result.snapshot) setSnapshot(result.snapshot)
    if (result.message) setToast(result.message)
  }, [])

  const run = useCallback(
    async (operation: () => Promise<ActionResult>): Promise<void> => {
      if (busy.current) return
      busy.current = true
      try {
        handleResult(await operation())
      } catch (error) {
        setToast(error instanceof Error ? error.message : 'Keypt could not complete that action.')
      } finally {
        busy.current = false
      }
    },
    [handleResult]
  )

  const activate = useCallback(
    async (id: string, action?: EnterAction): Promise<void> => {
      const currentApi = api
      if (!currentApi || !snapshot) return
      await run(() =>
        currentApi.activateItem({ id, action: action ?? snapshot.settings.enterAction })
      )
    },
    [run, snapshot]
  )

  const updateSettings = useCallback(
    async (patch: UpdateSettingsInput): Promise<void> => {
      const currentApi = api
      if (currentApi) await run(() => currentApi.updateSettings(patch))
    },
    [run]
  )

  useEffect(() => {
    const currentApi = api
    if (!snapshot || !currentApi) return

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.isComposing) return
      const modifier = snapshot.platform === 'darwin' ? event.metaKey : event.ctrlKey

      if (modifier && event.key === ',') {
        event.preventDefault()
        setView('settings')
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        if (view === 'settings') setView('history')
        else if (query) setQuery('')
        else void currentApi.hidePanel()
        return
      }

      if (view !== 'history') return

      const selectedIndex = Math.max(
        0,
        filteredItems.findIndex((item) => item.id === effectiveSelectedId)
      )

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        if (!filteredItems.length) return
        const direction = event.key === 'ArrowDown' ? 1 : -1
        const nextIndex = (selectedIndex + direction + filteredItems.length) % filteredItems.length
        setSelectedId(filteredItems[nextIndex].id)
        return
      }

      if (event.key === 'Enter' && effectiveSelectedId) {
        event.preventDefault()
        void activate(effectiveSelectedId, modifier ? 'copy' : snapshot.settings.enterAction)
        return
      }

      if (modifier && event.key.toLowerCase() === 'p' && effectiveSelectedId) {
        event.preventDefault()
        void run(() => currentApi.togglePin(effectiveSelectedId))
        return
      }

      if (modifier && event.shiftKey && event.key === 'Backspace' && !query) {
        event.preventDefault()
        if (Date.now() < clearArmedUntil.current) {
          void run(() => currentApi.clearHistory('unpinned'))
          clearArmedUntil.current = 0
        } else {
          clearArmedUntil.current = Date.now() + 3000
          setToast('Press again to clear unpinned history.')
        }
        return
      }

      if (
        ((modifier && event.key === 'Backspace' && !query) ||
          (event.shiftKey && event.key === 'Delete')) &&
        effectiveSelectedId
      ) {
        event.preventDefault()
        void run(() => currentApi.deleteItem(effectiveSelectedId))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activate, effectiveSelectedId, filteredItems, query, run, snapshot, view])

  if (loadError) {
    return (
      <div className="panel-shell panel-shell--error">
        <AlertCircle size={24} aria-hidden="true" />
        <h1>Keypt could not open</h1>
        <p>{loadError}</p>
      </div>
    )
  }

  if (!snapshot)
    return (
      <div className="panel-shell">
        <LoadingPanel />
      </div>
    )

  return (
    <div className="panel-shell">
      {view === 'history' ? (
        <HistoryView
          snapshot={snapshot}
          items={filteredItems}
          query={query}
          selectedId={effectiveSelectedId}
          now={now}
          onQueryChange={(nextQuery) => {
            setQuery(nextQuery)
            setSelectedId(undefined)
          }}
          onSelect={setSelectedId}
          onCopy={(id) => void activate(id, 'copy')}
          onTogglePin={(id) => void run(() => api?.togglePin(id) ?? Promise.resolve({ ok: false }))}
          onDelete={(id) => void run(() => api?.deleteItem(id) ?? Promise.resolve({ ok: false }))}
          onOpenSettings={() => setView('settings')}
          onResume={() => void run(() => api?.setPaused(false) ?? Promise.resolve({ ok: false }))}
        />
      ) : (
        <SettingsView
          snapshot={snapshot}
          onBack={() => setView('history')}
          onUpdate={updateSettings}
          onSetPaused={async (paused) => {
            const currentApi = api
            if (currentApi) await run(() => currentApi.setPaused(paused))
          }}
          onClear={async (scope) => {
            const currentApi = api
            if (currentApi) await run(() => currentApi.clearHistory(scope))
          }}
          onRequestPastePermission={async () => {
            const currentApi = api
            if (currentApi) await run(() => currentApi.requestPastePermission())
          }}
          onOpenDataFolder={async () => {
            const currentApi = api
            if (currentApi) await run(() => currentApi.openDataFolder())
          }}
          onCheckForUpdates={async () => {
            await api?.checkForUpdates()
          }}
          onDownloadUpdate={async () => {
            await api?.downloadUpdate()
          }}
          onInstallUpdate={async () => {
            await api?.installUpdate()
          }}
        />
      )}

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
