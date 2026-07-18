import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { z } from 'zod'

import {
  clipKindSchema,
  type AppSettings,
  type ClipboardItemView,
  type ClipKind
} from '../../shared/contracts'
import { createTextPreview } from '../clipboard/classify'
import { atomicWriteFile } from '../utils/atomic-file'
import {
  decryptEnvelope,
  encryptEnvelope,
  InvalidEncryptedPayloadError,
  isLegacyEnvelope
} from './encryption'

const INDEX_VERSION = 1
const SEARCH_TEXT_LIMIT = 16_384
const INDEX_ENCRYPTION_CONTEXT = `history-index:${INDEX_VERSION}`

const storedItemSchema = z.object({
  id: z.string().uuid(),
  kind: clipKindSchema,
  preview: z.string().max(1000),
  searchText: z.string().max(SEARCH_TEXT_LIMIT),
  thumbnailDataUrl: z.string().max(250_000).optional(),
  colorValue: z.string().max(128).optional(),
  sourceApp: z.string().min(1).max(256),
  copiedAt: z.number().int().nonnegative(),
  pinned: z.boolean(),
  byteSize: z.number().int().nonnegative(),
  digest: z.string().regex(/^[\da-f]{64}$/),
  payloadFile: z.string().regex(/^[\da-f-]{36}\.clip$/)
})

const historyIndexSchema = z.object({
  version: z.literal(INDEX_VERSION),
  items: z.array(storedItemSchema).max(2000)
})

type StoredItem = z.infer<typeof storedItemSchema>

export interface AddClipboardItem {
  kind: ClipKind
  payload: Buffer
  preview?: string
  searchText?: string
  thumbnailDataUrl?: string
  colorValue?: string
  sourceApp: string
  copiedAt?: number
}

export interface ItemPayload {
  item: ClipboardItemView
  data: Buffer
}

export class HistoryRepository {
  private readonly indexPath: string
  private readonly payloadDirectory: string
  private items: StoredItem[] = []
  private warning?: string
  private mutationQueue: Promise<void> = Promise.resolve()

  constructor(
    private readonly dataDirectory: string,
    private readonly masterKey: Buffer
  ) {
    this.indexPath = join(dataDirectory, 'history.index')
    this.payloadDirectory = join(dataDirectory, 'payloads')
  }

  async initialize(): Promise<void> {
    await mkdir(this.dataDirectory, { recursive: true, mode: 0o700 })
    await mkdir(this.payloadDirectory, { recursive: true, mode: 0o700 })

    try {
      const encryptedIndex = await readFile(this.indexPath)
      const plaintext = decryptEnvelope(this.masterKey, encryptedIndex, INDEX_ENCRYPTION_CONTEXT)
      this.items = historyIndexSchema.parse(JSON.parse(plaintext.toString('utf8'))).items
      if (isLegacyEnvelope(encryptedIndex)) await this.commit(this.items, [])
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(
          'Keypt could not open its encrypted history. The data was left untouched.',
          { cause: error }
        )
      }
    }

    await this.removeOrphanedPayloads()
  }

  getWarning(): string | undefined {
    return this.warning
  }

  list(): ClipboardItemView[] {
    return [...this.items]
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.copiedAt - a.copiedAt)
      .map((item) => this.toView(item))
  }

  add(input: AddClipboardItem, settings: AppSettings): Promise<ClipboardItemView> {
    return this.enqueue(() => this.addInternal(input, settings))
  }

  private async addInternal(
    input: AddClipboardItem,
    settings: AppSettings
  ): Promise<ClipboardItemView> {
    const digest = createHash('sha256').update(input.payload).digest('hex')
    const copiedAt = input.copiedAt ?? Date.now()
    const duplicate = this.items.find((item) => item.digest === digest)

    if (duplicate) {
      const nextItems = this.items.map((item) =>
        item.id === duplicate.id
          ? { ...item, sourceApp: input.sourceApp, copiedAt, kind: input.kind }
          : item
      )
      const retained = this.retainWithinLimits(nextItems, settings)
      await this.commit(retained.kept, retained.removed)
      const updated = retained.kept.find((item) => item.id === duplicate.id)
      if (!updated) throw new Error('The clipboard item was removed by the retention policy.')
      return this.toView(updated)
    }

    const id = randomUUID()
    const payloadFile = `${id}.clip`
    const item: StoredItem = {
      id,
      kind: input.kind,
      preview: input.preview ?? createTextPreview(input.payload.toString('utf8')),
      searchText: (input.searchText ?? input.payload.toString('utf8')).slice(0, SEARCH_TEXT_LIMIT),
      thumbnailDataUrl: input.thumbnailDataUrl,
      colorValue: input.colorValue,
      sourceApp: input.sourceApp,
      copiedAt,
      pinned: false,
      byteSize: input.payload.byteLength,
      digest,
      payloadFile
    }

    const payloadPath = join(this.payloadDirectory, payloadFile)
    await atomicWriteFile(
      payloadPath,
      encryptEnvelope(this.masterKey, input.payload, payloadEncryptionContext(id))
    )

    const retained = this.retainWithinLimits([...this.items, item], settings)
    try {
      await this.commit(retained.kept, retained.removed)
    } catch (error) {
      await rm(payloadPath, { force: true }).catch(() => undefined)
      throw error
    }

    return this.toView(item)
  }

  async getPayload(id: string): Promise<ItemPayload | undefined> {
    const item = this.items.find((candidate) => candidate.id === id)
    if (!item) return undefined
    const payloadPath = join(this.payloadDirectory, item.payloadFile)
    const encryptedPayload = await readFile(payloadPath)
    const data = decryptEnvelope(
      this.masterKey,
      encryptedPayload,
      payloadEncryptionContext(item.id)
    )
    const digest = createHash('sha256').update(data).digest('hex')
    if (digest !== item.digest) {
      throw new InvalidEncryptedPayloadError('Encrypted clipboard data does not match its index.')
    }
    if (isLegacyEnvelope(encryptedPayload)) {
      await atomicWriteFile(
        payloadPath,
        encryptEnvelope(this.masterKey, data, payloadEncryptionContext(item.id))
      )
    }
    return { item: this.toView(item), data }
  }

  touch(id: string): Promise<void> {
    return this.enqueue(() => this.touchInternal(id))
  }

  private async touchInternal(id: string): Promise<void> {
    if (!this.items.some((item) => item.id === id)) return
    const nextItems = this.items.map((item) =>
      item.id === id ? { ...item, copiedAt: Date.now() } : item
    )
    await this.commit(nextItems, [])
  }

  togglePin(id: string): Promise<void> {
    return this.enqueue(() => this.togglePinInternal(id))
  }

  private async togglePinInternal(id: string): Promise<void> {
    if (!this.items.some((item) => item.id === id)) return
    const nextItems = this.items.map((item) =>
      item.id === id ? { ...item, pinned: !item.pinned } : item
    )
    await this.commit(nextItems, [])
  }

  delete(id: string): Promise<void> {
    return this.enqueue(() => this.deleteInternal(id))
  }

  private async deleteInternal(id: string): Promise<void> {
    const removed = this.items.filter((item) => item.id === id)
    if (!removed.length) return
    await this.commit(
      this.items.filter((item) => item.id !== id),
      removed
    )
  }

  clear(scope: 'unpinned' | 'all'): Promise<void> {
    return this.enqueue(() => this.clearInternal(scope))
  }

  private async clearInternal(scope: 'unpinned' | 'all'): Promise<void> {
    const kept = scope === 'all' ? [] : this.items.filter((item) => item.pinned)
    const removed = this.items.filter((item) => !kept.includes(item))
    await this.commit(kept, removed)
  }

  cleanup(settings: AppSettings): Promise<boolean> {
    return this.enqueue(() => this.cleanupInternal(settings))
  }

  private async cleanupInternal(settings: AppSettings): Promise<boolean> {
    const retained = this.retainWithinLimits(this.items, settings)
    if (!retained.removed.length) return false
    await this.commit(retained.kept, retained.removed)
    return true
  }

  private retainWithinLimits(
    items: StoredItem[],
    settings: AppSettings
  ): { kept: StoredItem[]; removed: StoredItem[] } {
    const cutoff = settings.cleanupDays === 0 ? 0 : Date.now() - settings.cleanupDays * 86_400_000
    const sortedUnpinned = items
      .filter((item) => !item.pinned)
      .sort((a, b) => b.copiedAt - a.copiedAt)
    const allowedIds = new Set(
      sortedUnpinned
        .filter((item) => cutoff === 0 || item.copiedAt >= cutoff)
        .slice(0, settings.historyLimit)
        .map((item) => item.id)
    )
    const kept = items.filter((item) => item.pinned || allowedIds.has(item.id))
    const keptIds = new Set(kept.map((item) => item.id))
    return { kept, removed: items.filter((item) => !keptIds.has(item.id)) }
  }

  private async commit(nextItems: StoredItem[], removed: StoredItem[]): Promise<void> {
    const index = historyIndexSchema.parse({ version: INDEX_VERSION, items: nextItems })
    const encrypted = encryptEnvelope(
      this.masterKey,
      Buffer.from(JSON.stringify(index), 'utf8'),
      INDEX_ENCRYPTION_CONTEXT
    )
    await atomicWriteFile(this.indexPath, encrypted)
    this.items = nextItems

    await Promise.all(
      removed.map((item) =>
        rm(join(this.payloadDirectory, item.payloadFile), { force: true }).catch(() => {
          this.warning = 'Some expired payload files could not be removed. Keypt will retry later.'
        })
      )
    )
  }

  private toView(item: StoredItem): ClipboardItemView {
    return {
      id: item.id,
      kind: item.kind,
      preview: item.preview,
      searchText: item.searchText,
      thumbnailDataUrl: item.thumbnailDataUrl,
      colorValue: item.colorValue,
      sourceApp: item.sourceApp,
      copiedAt: item.copiedAt,
      pinned: item.pinned,
      byteSize: item.byteSize
    }
  }

  private async removeOrphanedPayloads(): Promise<void> {
    const referenced = new Set(this.items.map((item) => item.payloadFile))
    const files = await readdir(this.payloadDirectory).catch(() => [])
    await Promise.all(
      files
        .filter((file) => /^[\da-f-]{36}\.clip$/.test(file) && !referenced.has(file))
        .map((file) => rm(join(this.payloadDirectory, file), { force: true }))
    )
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation, operation)
    this.mutationQueue = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }
}

function payloadEncryptionContext(id: string): string {
  return `clipboard-payload:${id}`
}
