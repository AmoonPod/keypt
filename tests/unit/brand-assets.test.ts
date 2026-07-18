import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const projectRoot = fileURLToPath(new URL('../..', import.meta.url))
const publicDirectory = join(projectRoot, 'src', 'renderer', 'public')

describe('brand assets', () => {
  it('keeps the renderer favicon in sync with the app icon master', async () => {
    const [appIcon, favicon] = await Promise.all([
      readFile(join(projectRoot, 'assets', 'app-icon.svg'), 'utf8'),
      readFile(join(publicDirectory, 'favicon.svg'), 'utf8')
    ])

    expect(favicon).toBe(appIcon)
  })

  it.each([
    ['favicon-16x16.png', 16],
    ['favicon-32x32.png', 32],
    ['apple-touch-icon.png', 180]
  ])('exports %s at %dpx', async (fileName, size) => {
    const metadata = await sharp(join(publicDirectory, fileName)).metadata()

    expect(metadata.width).toBe(size)
    expect(metadata.height).toBe(size)
  })

  it('ships browser fallbacks referenced by the renderer document', async () => {
    const [html, ico] = await Promise.all([
      readFile(join(projectRoot, 'src', 'renderer', 'index.html'), 'utf8'),
      stat(join(publicDirectory, 'favicon.ico'))
    ])

    for (const asset of [
      'favicon.ico',
      'favicon-16x16.png',
      'favicon-32x32.png',
      'favicon.svg',
      'apple-touch-icon.png'
    ]) {
      expect(html).toContain(`href="./${asset}"`)
    }
    expect(ico.size).toBeGreaterThan(0)
  })
})
