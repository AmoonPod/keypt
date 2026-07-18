import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const MAGIC = Buffer.from('KYPT2', 'ascii')
const LEGACY_MAGIC = Buffer.from('KYPT1', 'ascii')
const IV_BYTES = 12
const TAG_BYTES = 16
const KEY_BYTES = 32

export class InvalidEncryptedPayloadError extends Error {
  constructor(message = 'Encrypted clipboard data is invalid or cannot be authenticated.') {
    super(message)
    this.name = 'InvalidEncryptedPayloadError'
  }
}

export function createMasterKey(): Buffer {
  return randomBytes(KEY_BYTES)
}

function associatedData(magic: Buffer, context: string): Buffer {
  const encoded = Buffer.from(context, 'utf8')
  if (!encoded.byteLength || encoded.byteLength > 256) {
    throw new Error('Keypt encryption contexts must contain between 1 and 256 bytes.')
  }
  return Buffer.concat([magic, Buffer.from([0]), encoded])
}

export function isLegacyEnvelope(envelope: Uint8Array): boolean {
  return Buffer.from(envelope).subarray(0, LEGACY_MAGIC.length).equals(LEGACY_MAGIC)
}

export function encryptEnvelope(key: Uint8Array, plaintext: Uint8Array, context: string): Buffer {
  if (key.byteLength !== KEY_BYTES) throw new Error('Keypt encryption keys must be 256 bits.')

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(associatedData(MAGIC, context))
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return Buffer.concat([MAGIC, iv, tag, ciphertext])
}

export function decryptEnvelope(key: Uint8Array, envelope: Uint8Array, context: string): Buffer {
  if (key.byteLength !== KEY_BYTES) throw new Error('Keypt encryption keys must be 256 bits.')

  const data = Buffer.from(envelope)
  const minimumBytes = MAGIC.length + IV_BYTES + TAG_BYTES
  const magic = isLegacyEnvelope(data) ? LEGACY_MAGIC : MAGIC
  if (data.byteLength < minimumBytes || !data.subarray(0, magic.length).equals(magic)) {
    throw new InvalidEncryptedPayloadError()
  }

  const ivStart = magic.length
  const tagStart = ivStart + IV_BYTES
  const payloadStart = tagStart + TAG_BYTES
  const iv = data.subarray(ivStart, tagStart)
  const tag = data.subarray(tagStart, payloadStart)
  const ciphertext = data.subarray(payloadStart)

  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAAD(magic.equals(LEGACY_MAGIC) ? LEGACY_MAGIC : associatedData(MAGIC, context))
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()])
  } catch {
    throw new InvalidEncryptedPayloadError()
  }
}
