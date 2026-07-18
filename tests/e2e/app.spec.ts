import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { expect, test } from '@playwright/test'
import { _electron as electron } from 'playwright'

import type { AppSnapshot, KeyptApi } from '../../src/shared/contracts'

function cleanEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[0] !== 'ELECTRON_RUN_AS_NODE'
    )
  )
}

test('opens through the sandboxed preload bridge and keeps history encrypted', async ({
  browserName
}, testInfo) => {
  expect(browserName).toBe('chromium')
  const userData = testInfo.outputPath('user-data')
  const executablePath = process.env.KEYPT_E2E_EXECUTABLE
  const application = await electron.launch({
    ...(executablePath ? { executablePath: resolve(executablePath) } : {}),
    args: [...(executablePath ? [] : [resolve('.')]), `--user-data-dir=${userData}`],
    env: {
      ...cleanEnvironment(),
      NODE_ENV: 'test',
      KEYPT_E2E: '1',
      KEYPT_E2E_SEED: '1',
      KEYPT_DISABLE_DEVTOOLS: '1',
      KEYPT_TEST_MASTER_KEY: '11'.repeat(32)
    }
  })

  try {
    const page = await application.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    const search = page.getByRole('textbox', { name: 'Search clipboard history' })
    await expect(search).toBeVisible()
    await expect(page.getByRole('option')).toHaveCount(4)

    const snapshot = (await page.evaluate(async () => {
      const bridge = (globalThis as unknown as { keypt?: KeyptApi }).keypt
      return bridge?.getSnapshot()
    })) as AppSnapshot | undefined

    expect(snapshot?.secureStorage).toBe(true)
    expect(snapshot?.shortcutRegistered).toBe(true)
    expect(snapshot?.items[0].pinned).toBe(true)

    await search.fill('github')
    await expect(page.getByRole('option')).toHaveCount(1)
    await search.press('Escape')
    await expect(page.getByRole('option')).toHaveCount(4)

    await page.getByRole('button', { name: 'Open settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await page.getByRole('radio', { name: 'Dark' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'dark')

    await page.getByRole('button', { name: 'Back to history' }).click()
    await page.getByRole('option', { name: /github\.com\/electron\/electron/ }).click()
    const copiedText = await application.evaluate(({ clipboard }) => clipboard.readText())
    expect(copiedText).toBe('https://github.com/electron/electron')

    const encryptedIndex = await readFile(join(userData, 'vault', 'history.index'))
    expect(encryptedIndex.subarray(0, 5).toString('ascii')).toBe('KYPT2')
    expect(encryptedIndex.includes(Buffer.from('Everything stays on this device.'))).toBe(false)
  } finally {
    await application.close()
  }
})
