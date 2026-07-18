// @ts-check

import { access, readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const mainBundle = resolve(root, 'out', 'main', 'index.js')
const preload = resolve(root, 'out', 'preload', 'index.cjs')
const rendererHtml = resolve(root, 'out', 'renderer', 'index.html')
const MAX_RENDERER_JAVASCRIPT_BYTES = 700_000

await Promise.all([access(mainBundle), access(preload), access(rendererHtml)])
const mainSource = await readFile(mainBundle, 'utf8')
if (!mainSource.includes('electron-updater')) {
  throw new Error('The main bundle does not retain the packaged electron-updater dependency.')
}
if (!mainSource.includes("connect-src 'none'")) {
  throw new Error('The main bundle does not retain the packaged network-deny CSP.')
}
const rendererSource = await readFile(rendererHtml, 'utf8')
if (/localhost:8400|https?:\/\/|wss?:\/\//.test(rendererSource)) {
  throw new Error('The packaged renderer HTML contains a remote or live-design origin.')
}

const builtFiles = await walk(resolve(root, 'out'))
const sourceMaps = builtFiles.filter((file) => file.endsWith('.map'))
if (sourceMaps.length) {
  throw new Error(`Production output contains source maps: ${sourceMaps.join(', ')}`)
}
const rendererJavaScript = builtFiles.filter(
  (file) => file.startsWith(resolve(root, 'out', 'renderer')) && file.endsWith('.js')
)
const rendererJavaScriptBytes = (
  await Promise.all(rendererJavaScript.map(async (file) => (await stat(file)).size))
).reduce((total, size) => total + size, 0)
if (rendererJavaScriptBytes > MAX_RENDERER_JAVASCRIPT_BYTES) {
  throw new Error(
    `Renderer JavaScript is ${rendererJavaScriptBytes} bytes; budget is ${MAX_RENDERER_JAVASCRIPT_BYTES}.`
  )
}

process.stdout.write(
  `Verified production entry points and ${rendererJavaScriptBytes}-byte renderer JavaScript budget.\n`
)

/**
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(path)))
    else files.push(path)
  }
  return files
}
