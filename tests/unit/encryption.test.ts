import { randomBytes } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  decryptEnvelope,
  encryptEnvelope,
  InvalidEncryptedPayloadError
} from '../../src/main/storage/encryption'

describe('encrypted envelopes', () => {
  it('round-trips authenticated data with a unique nonce', () => {
    const key = randomBytes(32)
    const plaintext = Buffer.from('clipboard data stays private')
    const first = encryptEnvelope(key, plaintext, 'test-payload:first')
    const second = encryptEnvelope(key, plaintext, 'test-payload:first')

    expect(first.subarray(0, 5).toString('ascii')).toBe('KYPT2')
    expect(first.equals(second)).toBe(false)
    expect(decryptEnvelope(key, first, 'test-payload:first').equals(plaintext)).toBe(true)
    expect(decryptEnvelope(key, second, 'test-payload:first').equals(plaintext)).toBe(true)
  })

  it('rejects tampering and the wrong key', () => {
    const key = randomBytes(32)
    const encrypted = encryptEnvelope(key, Buffer.from('sensitive value'), 'test-payload:first')
    const tampered = Buffer.from(encrypted)
    tampered[tampered.length - 1] ^= 1

    expect(() => decryptEnvelope(key, tampered, 'test-payload:first')).toThrow(
      InvalidEncryptedPayloadError
    )
    expect(() => decryptEnvelope(randomBytes(32), encrypted, 'test-payload:first')).toThrow(
      InvalidEncryptedPayloadError
    )
    expect(() => decryptEnvelope(key, encrypted, 'test-payload:second')).toThrow(
      InvalidEncryptedPayloadError
    )
  })

  it('rejects malformed input before decryption', () => {
    expect(() => decryptEnvelope(randomBytes(32), Buffer.from('plaintext'), 'test')).toThrow(
      InvalidEncryptedPayloadError
    )
  })
})
