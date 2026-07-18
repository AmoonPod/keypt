import { z } from 'zod'

export const clipKindSchema = z.enum(['text', 'link', 'code', 'color', 'image'])
export type ClipKind = z.infer<typeof clipKindSchema>

export const themeSchema = z.enum(['system', 'light', 'dark'])
export type ThemePreference = z.infer<typeof themeSchema>

export const enterActionSchema = z.enum(['paste', 'copy'])
export type EnterAction = z.infer<typeof enterActionSchema>

export const cleanupDaysSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(7),
  z.literal(30),
  z.literal(90)
])
export type CleanupDays = z.infer<typeof cleanupDaysSchema>

export const appSettingsSchema = z.object({
  theme: themeSchema,
  historyLimit: z.number().int().min(25).max(1000),
  cleanupDays: cleanupDaysSchema,
  excludedApps: z.array(z.string().trim().min(1).max(128)).max(100),
  launchAtStartup: z.boolean(),
  enterAction: enterActionSchema,
  shortcut: z.string().trim().min(3).max(80)
})

export type AppSettings = z.infer<typeof appSettingsSchema>

export const updatePhaseSchema = z.enum([
  'disabled',
  'idle',
  'checking',
  'up-to-date',
  'available',
  'downloading',
  'downloaded',
  'error'
])

export const updateStateSchema = z.object({
  phase: updatePhaseSchema,
  currentVersion: z.string().min(1),
  availableVersion: z.string().min(1).optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  checkedAt: z.string().datetime().optional(),
  message: z.string().optional()
})

export type UpdateState = z.infer<typeof updateStateSchema>

export const DEFAULT_EXCLUDED_APPS = [
  '1Password',
  'Apple Passwords',
  'Bitwarden',
  'Dashlane',
  'Enpass',
  'KeePassXC',
  'Keeper',
  'LastPass',
  'NordPass',
  'Passwords',
  'Proton Pass',
  'Secrets'
] as const

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  historyLimit: 200,
  cleanupDays: 30,
  excludedApps: [...DEFAULT_EXCLUDED_APPS],
  launchAtStartup: false,
  enterAction: 'paste',
  shortcut: 'CommandOrControl+Shift+V'
}

export const clipboardItemViewSchema = z.object({
  id: z.string().uuid(),
  kind: clipKindSchema,
  preview: z.string(),
  searchText: z.string(),
  thumbnailDataUrl: z.string().optional(),
  colorValue: z.string().optional(),
  sourceApp: z.string(),
  copiedAt: z.number().int().nonnegative(),
  pinned: z.boolean(),
  byteSize: z.number().int().nonnegative()
})

export type ClipboardItemView = z.infer<typeof clipboardItemViewSchema>

export const appSnapshotSchema = z.object({
  items: z.array(clipboardItemViewSchema),
  settings: appSettingsSchema,
  appVersion: z.string().min(1),
  update: updateStateSchema,
  platform: z.enum(['darwin', 'win32', 'other']),
  paused: z.boolean(),
  shortcutRegistered: z.boolean(),
  secureStorage: z.boolean(),
  pastePermission: z.enum(['granted', 'required', 'unavailable']),
  warning: z.string().optional()
})

export type AppSnapshot = z.infer<typeof appSnapshotSchema>

export const itemIdInputSchema = z.object({ id: z.string().uuid() })
export const activateItemInputSchema = z.object({
  id: z.string().uuid(),
  action: enterActionSchema
})
export const clearHistoryInputSchema = z.object({
  scope: z.enum(['unpinned', 'all'])
})
export const updateSettingsInputSchema = appSettingsSchema.partial()
export const setPausedInputSchema = z.object({ paused: z.boolean() })
export const showViewInputSchema = z.object({ view: z.enum(['history', 'settings']) })

export type ActivateItemInput = z.infer<typeof activateItemInputSchema>
export type ClearHistoryInput = z.infer<typeof clearHistoryInputSchema>
export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>

export const actionResultSchema = z.object({
  ok: z.boolean(),
  message: z.string().optional(),
  snapshot: appSnapshotSchema.optional()
})

export type ActionResult = z.infer<typeof actionResultSchema>

export interface KeyptApi {
  getSnapshot: () => Promise<AppSnapshot>
  activateItem: (input: ActivateItemInput) => Promise<ActionResult>
  togglePin: (id: string) => Promise<ActionResult>
  deleteItem: (id: string) => Promise<ActionResult>
  clearHistory: (scope: ClearHistoryInput['scope']) => Promise<ActionResult>
  updateSettings: (patch: UpdateSettingsInput) => Promise<ActionResult>
  setPaused: (paused: boolean) => Promise<ActionResult>
  requestPastePermission: () => Promise<ActionResult>
  openDataFolder: () => Promise<ActionResult>
  checkForUpdates: () => Promise<UpdateState>
  downloadUpdate: () => Promise<UpdateState>
  installUpdate: () => Promise<void>
  hidePanel: () => Promise<void>
  onSnapshot: (callback: (snapshot: AppSnapshot) => void) => () => void
  onNavigate: (callback: (view: 'history' | 'settings') => void) => () => void
}

export const IPC = {
  getSnapshot: 'keypt:get-snapshot',
  activateItem: 'keypt:activate-item',
  togglePin: 'keypt:toggle-pin',
  deleteItem: 'keypt:delete-item',
  clearHistory: 'keypt:clear-history',
  updateSettings: 'keypt:update-settings',
  setPaused: 'keypt:set-paused',
  requestPastePermission: 'keypt:request-paste-permission',
  openDataFolder: 'keypt:open-data-folder',
  checkForUpdates: 'keypt:update-check',
  downloadUpdate: 'keypt:update-download',
  installUpdate: 'keypt:update-install',
  hidePanel: 'keypt:hide-panel',
  snapshot: 'keypt:snapshot',
  navigate: 'keypt:navigate'
} as const
