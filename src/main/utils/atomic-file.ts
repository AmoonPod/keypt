import { randomUUID } from 'node:crypto'
import { chmod, mkdir, open, rename, rm } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

export async function atomicWriteFile(
  targetPath: string,
  data: string | Uint8Array,
  mode = 0o600
): Promise<void> {
  const directory = dirname(targetPath)
  await mkdir(directory, { recursive: true, mode: 0o700 })

  const temporaryPath = join(
    directory,
    `.${basename(targetPath)}.${process.pid}.${randomUUID()}.tmp`
  )
  const handle = await open(temporaryPath, 'wx', mode)

  try {
    await handle.writeFile(data)
    await handle.sync()
  } finally {
    await handle.close()
  }

  try {
    await rename(temporaryPath, targetPath)
    await chmod(targetPath, mode).catch(() => undefined)
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined)
  }
}
