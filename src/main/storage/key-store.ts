import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { app, safeStorage } from 'electron'

import { atomicWriteFile } from '../utils/atomic-file'
import { createMasterKey } from './encryption'

const KEY_FILE = 'master-key.safe'

export class SecureStorageUnavailableError extends Error {
  constructor() {
    super('Your operating system secure storage is unavailable, so Keypt will not save history.')
    this.name = 'SecureStorageUnavailableError'
  }
}

function readTestKey(): Buffer | undefined {
  if (app.isPackaged) return undefined
  const value = process.env.KEYPT_TEST_MASTER_KEY
  if (!value || (process.env.NODE_ENV !== 'test' && process.env.KEYPT_E2E !== '1')) return undefined
  const key = Buffer.from(value, 'hex')
  if (key.byteLength !== 32) throw new Error('KEYPT_TEST_MASTER_KEY must contain 32 bytes of hex.')
  return key
}

export async function getOrCreateMasterKey(dataDirectory: string): Promise<Buffer> {
  const testKey = readTestKey()
  if (testKey) return testKey

  if (!safeStorage.isEncryptionAvailable()) throw new SecureStorageUnavailableError()

  const keyPath = join(dataDirectory, KEY_FILE)

  try {
    const wrappedKey = await readFile(keyPath)
    const decoded = Buffer.from(safeStorage.decryptString(wrappedKey), 'base64')
    if (decoded.byteLength !== 32) throw new Error('The stored Keypt key has an invalid length.')
    return decoded
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') throw error
  }

  const key = createMasterKey()
  const wrappedKey = safeStorage.encryptString(key.toString('base64'))
  await atomicWriteFile(keyPath, wrappedKey)
  return key
}
