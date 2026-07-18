import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  appSettingsSchema,
  DEFAULT_SETTINGS,
  type AppSettings,
  type UpdateSettingsInput
} from '../shared/contracts'
import { atomicWriteFile } from './utils/atomic-file'

export class SettingsLoadError extends Error {
  constructor(cause: unknown) {
    super('Keypt could not load preferences safely. The original file was left untouched.', {
      cause
    })
    this.name = 'SettingsLoadError'
  }
}

export class SettingsStore {
  private readonly settingsPath: string
  private settings: AppSettings = DEFAULT_SETTINGS

  constructor(dataDirectory: string) {
    this.settingsPath = join(dataDirectory, 'preferences.json')
  }

  async load(): Promise<AppSettings> {
    try {
      const file = await readFile(this.settingsPath, 'utf8')
      const parsed: unknown = JSON.parse(file)
      this.settings = appSettingsSchema.parse({ ...DEFAULT_SETTINGS, ...(parsed as object) })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new SettingsLoadError(error)
    }

    return this.get()
  }

  get(): AppSettings {
    return {
      ...this.settings,
      excludedApps: [...this.settings.excludedApps]
    }
  }

  async update(patch: UpdateSettingsInput): Promise<AppSettings> {
    this.settings = appSettingsSchema.parse({ ...this.settings, ...patch })
    await this.save()
    return this.get()
  }

  private async save(): Promise<void> {
    await atomicWriteFile(this.settingsPath, `${JSON.stringify(this.settings, null, 2)}\n`)
  }
}
