import { randomBytes } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS, type AppSettings } from '../../src/shared/contracts'
import { HistoryRepository } from '../../src/main/storage/history-repository'

const temporaryDirectories: string[] = []

async function repository(): Promise<{ directory: string; history: HistoryRepository }> {
  const directory = await mkdtemp(join(tmpdir(), 'keypt-history-test-'))
  temporaryDirectories.push(directory)
  const history = new HistoryRepository(directory, randomBytes(32))
  await history.initialize()
  return { directory, history }
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

describe('encrypted history repository', () => {
  it('persists ciphertext, restores payloads, and deduplicates repeated copies', async () => {
    const { directory, history } = await repository()
    const payload = Buffer.from('same local clipboard value')
    const firstCopiedAt = Date.now() - 1000
    const secondCopiedAt = Date.now()
    const first = await history.add(
      { kind: 'text', payload, sourceApp: 'Notes', copiedAt: firstCopiedAt },
      DEFAULT_SETTINGS
    )
    const duplicate = await history.add(
      { kind: 'text', payload, sourceApp: 'Terminal', copiedAt: secondCopiedAt },
      DEFAULT_SETTINGS
    )

    expect(duplicate.id).toBe(first.id)
    expect(history.list()).toHaveLength(1)
    expect(history.list()[0]).toMatchObject({ sourceApp: 'Terminal', copiedAt: secondCopiedAt })
    expect((await history.getPayload(first.id))?.data.equals(payload)).toBe(true)

    const encryptedIndex = await readFile(join(directory, 'history.index'))
    const encryptedPayload = await readFile(join(directory, 'payloads', `${first.id}.clip`))
    expect(encryptedIndex.subarray(0, 5).toString('ascii')).toBe('KYPT2')
    expect(encryptedPayload.subarray(0, 5).toString('ascii')).toBe('KYPT2')
    expect(encryptedIndex.includes(payload)).toBe(false)
    expect(encryptedPayload.includes(payload)).toBe(false)
  })

  it('keeps pinned items outside age and count limits', async () => {
    const { history } = await repository()
    const tightSettings: AppSettings = { ...DEFAULT_SETTINGS, historyLimit: 2, cleanupDays: 1 }
    const oldPinned = await history.add(
      {
        kind: 'text',
        payload: Buffer.from('pinned'),
        sourceApp: 'Notes',
        copiedAt: Date.now() - 10 * 86_400_000
      },
      DEFAULT_SETTINGS
    )
    await history.togglePin(oldPinned.id)

    for (const value of ['one', 'two', 'three']) {
      await history.add(
        { kind: 'text', payload: Buffer.from(value), sourceApp: 'Terminal' },
        tightSettings
      )
    }

    const items = history.list()
    expect(items).toHaveLength(3)
    expect(items[0]).toMatchObject({ id: oldPinned.id, pinned: true })
    expect(items.some((item) => item.preview === 'one')).toBe(false)
  })

  it('clears unpinned items without deleting pins', async () => {
    const { history } = await repository()
    const pinned = await history.add(
      { kind: 'text', payload: Buffer.from('keep'), sourceApp: 'Notes' },
      DEFAULT_SETTINGS
    )
    await history.togglePin(pinned.id)
    await history.add(
      { kind: 'text', payload: Buffer.from('remove'), sourceApp: 'Notes' },
      DEFAULT_SETTINGS
    )

    await history.clear('unpinned')
    expect(history.list()).toEqual([expect.objectContaining({ id: pinned.id, pinned: true })])
  })
})
