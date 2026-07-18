import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { SettingsLoadError, SettingsStore } from '../../src/main/settings'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'keypt-settings-test-'))
  temporaryDirectories.push(directory)
  return directory
}

describe('SettingsStore', () => {
  it('uses privacy-preserving defaults when no preference file exists', async () => {
    const store = new SettingsStore(await temporaryDirectory())

    await expect(store.load()).resolves.toEqual(DEFAULT_SETTINGS)
  })

  it('merges a valid partial preference file with defaults', async () => {
    const directory = await temporaryDirectory()
    await writeFile(join(directory, 'preferences.json'), '{"theme":"dark"}\n')
    const store = new SettingsStore(directory)

    await expect(store.load()).resolves.toMatchObject({ ...DEFAULT_SETTINGS, theme: 'dark' })
  })

  it('fails closed and preserves a corrupt preference file', async () => {
    const directory = await temporaryDirectory()
    const path = join(directory, 'preferences.json')
    const corrupt = '{"excludedApps":"not-an-array"}\n'
    await writeFile(path, corrupt)
    const store = new SettingsStore(directory)

    await expect(store.load()).rejects.toBeInstanceOf(SettingsLoadError)
    await expect(readFile(path, 'utf8')).resolves.toBe(corrupt)
  })
})
