import { LockKeyhole, Pause, Search, Settings2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import type { AppSnapshot, ClipboardItemView } from '../../../shared/contracts'
import { BrandMark } from './BrandMark'
import { ClipRow } from './ClipRow'

interface HistoryViewProps {
  snapshot: AppSnapshot
  items: ClipboardItemView[]
  query: string
  selectedId?: string
  now: number
  onQueryChange: (query: string) => void
  onSelect: (id: string) => void
  onCopy: (id: string) => void
  onTogglePin: (id: string) => void
  onDelete: (id: string) => void
  onOpenSettings: () => void
  onResume: () => void
}

export function relativeTime(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000))
  if (seconds < 10) return 'now'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(timestamp)
}

export function HistoryView({
  snapshot,
  items,
  query,
  selectedId,
  now,
  onQueryChange,
  onSelect,
  onCopy,
  onTogglePin,
  onDelete,
  onOpenSettings,
  onResume
}: HistoryViewProps): React.JSX.Element {
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    document.querySelector(`[data-clip-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  return (
    <>
      <header className="search-header">
        <Search className="search-icon" size={20} aria-hidden="true" />
        <input
          ref={searchRef}
          className="search-input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search your clipboard"
          aria-label="Search clipboard history"
          autoComplete="off"
          spellCheck={false}
        />
        {query ? (
          <button
            type="button"
            className="icon-button clear-search"
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : (
          <span className="item-count" aria-label={`${snapshot.items.length} clipboard items`}>
            {snapshot.items.length}
          </span>
        )}
        <button
          type="button"
          className="icon-button settings-button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
        >
          <Settings2 size={18} aria-hidden="true" />
        </button>
      </header>

      {snapshot.paused ? (
        <div className="paused-banner" role="status">
          <Pause size={14} fill="currentColor" aria-hidden="true" />
          <span>Capture paused</span>
          <button type="button" onClick={onResume}>
            Resume
          </button>
        </div>
      ) : null}

      <main className="history-body">
        {snapshot.items.length === 0 ? (
          <div className="empty-state">
            <BrandMark size={32} className="empty-mark" />
            <h1>Copy something.</h1>
            <p>Text, links, code, colors, and images will appear here.</p>
            <kbd>{snapshot.platform === 'darwin' ? '⌘⇧V' : 'Ctrl + Shift + V'}</kbd>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state empty-state--search">
            <Search size={24} aria-hidden="true" />
            <h1>No matches</h1>
            <p>Try a different word, app, or type.</p>
          </div>
        ) : (
          <div className="clip-list" role="listbox" aria-label="Clipboard history">
            {items.map((item) => (
              <ClipRow
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                relativeTime={relativeTime(item.copiedAt, now)}
                onSelect={() => onSelect(item.id)}
                onCopy={() => onCopy(item.id)}
                onTogglePin={() => onTogglePin(item.id)}
                onDelete={() => onDelete(item.id)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="panel-footer">
        <span className="encryption-state">
          <LockKeyhole size={12} aria-hidden="true" /> Local + encrypted
        </span>
        <div className="shortcut-hints" aria-hidden="true">
          <span>Click · Copy</span>
          <span>
            <kbd>↵</kbd> {snapshot.settings.enterAction === 'paste' ? 'Paste' : 'Copy'}
          </span>
          <span>
            <kbd>{snapshot.platform === 'darwin' ? '⌘' : 'Ctrl'}↵</kbd> Copy
          </span>
        </div>
      </footer>
    </>
  )
}
