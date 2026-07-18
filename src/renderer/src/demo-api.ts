import {
  DEFAULT_SETTINGS,
  type ActionResult,
  type AppSnapshot,
  type ClipboardItemView,
  type KeyptApi
} from '../../shared/contracts'

const now = Date.now()
const demoImage =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" fill="#1d2538"/><rect x="16" y="18" width="74" height="10" rx="5" fill="#748ee7"/><rect x="16" y="40" width="128" height="6" rx="3" fill="#526079"/><rect x="16" y="55" width="104" height="6" rx="3" fill="#526079"/><rect x="16" y="79" width="36" height="25" rx="5" fill="#e3ad45"/><rect x="60" y="79" width="84" height="25" rx="5" fill="#303b54"/></svg>'
  )

let items: ClipboardItemView[] = [
  {
    id: '951e47ce-ea9b-4de8-9ad2-1a8b1b471999',
    kind: 'code',
    preview: "const shortcut = 'CommandOrControl+Shift+V'\nregister(shortcut)",
    searchText: "const shortcut = 'CommandOrControl+Shift+V' register(shortcut)",
    sourceApp: 'Visual Studio Code',
    copiedAt: now - 74_000,
    pinned: true,
    byteSize: 72
  },
  {
    id: 'f58e58ab-c44a-431e-a54e-0bbefea1ed70',
    kind: 'link',
    preview: 'https://github.com/electron/electron',
    searchText: 'github electron open source desktop framework',
    sourceApp: 'Safari',
    copiedAt: now - 4 * 60_000,
    pinned: false,
    byteSize: 40
  },
  {
    id: '75d85fad-f5c5-469f-98e5-34d55d46d220',
    kind: 'color',
    preview: '#5B72D6',
    searchText: '#5B72D6 cobalt blue color',
    colorValue: '#5B72D6',
    sourceApp: 'Figma',
    copiedAt: now - 11 * 60_000,
    pinned: false,
    byteSize: 7
  },
  {
    id: '3fc12fde-86e5-48c2-8053-0b5d39ee63a3',
    kind: 'text',
    preview: 'Keep the tool small enough that people leave it installed.',
    searchText: 'Keep the tool small enough that people leave it installed.',
    sourceApp: 'Notes',
    copiedAt: now - 18 * 60_000,
    pinned: false,
    byteSize: 59
  },
  {
    id: 'e10df418-f786-4b1e-971b-dc5b43ad0261',
    kind: 'image',
    preview: '160 × 120 image',
    searchText: '160 × 120 image Arc',
    thumbnailDataUrl: demoImage,
    sourceApp: 'Arc',
    copiedAt: now - 37 * 60_000,
    pinned: false,
    byteSize: 18_420
  },
  {
    id: '2524c1bb-5c34-47ac-994c-1ea7e91bf1ea',
    kind: 'text',
    preview: 'npm run check && npm run dist',
    searchText: 'npm run check npm run dist release build',
    sourceApp: 'Terminal',
    copiedAt: now - 62 * 60_000,
    pinned: false,
    byteSize: 34
  }
]

let snapshot: AppSnapshot = {
  items,
  settings: DEFAULT_SETTINGS,
  appVersion: '0.1.0',
  update: {
    phase: 'disabled',
    currentVersion: '0.1.0',
    message: 'Automatic updates are enabled in packaged release builds.'
  },
  platform: 'darwin',
  paused: false,
  shortcutRegistered: true,
  secureStorage: true,
  pastePermission: 'required'
}

const snapshotListeners = new Set<(value: AppSnapshot) => void>()
const navigateListeners = new Set<(view: 'history' | 'settings') => void>()

function publish(): AppSnapshot {
  snapshot = { ...snapshot, items: [...items], settings: { ...snapshot.settings } }
  snapshotListeners.forEach((listener) => listener(snapshot))
  return snapshot
}

function result(message?: string): ActionResult {
  return { ok: true, message, snapshot: publish() }
}

export function createDemoApi(): KeyptApi {
  return {
    getSnapshot: async () => snapshot,
    activateItem: async () => result('Preview mode: item copied.'),
    togglePin: async (id) => {
      items = items.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item))
      return result()
    },
    deleteItem: async (id) => {
      items = items.filter((item) => item.id !== id)
      return result()
    },
    clearHistory: async (scope) => {
      items = scope === 'all' ? [] : items.filter((item) => item.pinned)
      return result()
    },
    updateSettings: async (patch) => {
      snapshot = { ...snapshot, settings: { ...snapshot.settings, ...patch } }
      return result()
    },
    setPaused: async (paused) => {
      snapshot = { ...snapshot, paused }
      return result()
    },
    requestPastePermission: async () => {
      snapshot = { ...snapshot, pastePermission: 'granted' }
      return result('Accessibility access is ready.')
    },
    openDataFolder: async () => result('Preview mode: data folder opened.'),
    checkForUpdates: async () => snapshot.update,
    downloadUpdate: async () => snapshot.update,
    installUpdate: async () => undefined,
    hidePanel: async () => undefined,
    onSnapshot: (callback) => {
      snapshotListeners.add(callback)
      return () => snapshotListeners.delete(callback)
    },
    onNavigate: (callback) => {
      navigateListeners.add(callback)
      return () => navigateListeners.delete(callback)
    }
  }
}
