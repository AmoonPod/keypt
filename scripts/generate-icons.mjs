import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

import pngToIco from 'png-to-ico'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)
const projectRoot = resolve(import.meta.dirname, '..')
const appIconPath = join(projectRoot, 'assets', 'app-icon.svg')
const trayTemplatePath = join(projectRoot, 'assets', 'tray-template.svg')
const trayWindowsPath = join(projectRoot, 'assets', 'tray-windows.svg')
const buildDirectory = join(projectRoot, 'build')
const resourcesDirectory = join(projectRoot, 'resources')
const rendererPublicDirectory = join(projectRoot, 'src', 'renderer', 'public')
const iconsetDirectory = join(buildDirectory, 'icon.iconset')

await Promise.all([
  mkdir(buildDirectory, { recursive: true }),
  mkdir(resourcesDirectory, { recursive: true }),
  mkdir(rendererPublicDirectory, { recursive: true })
])

const appIconSvg = await readFile(appIconPath)
const trayTemplateSvg = await readFile(trayTemplatePath)
const trayWindowsSvg = await readFile(trayWindowsPath)

const renderPng = (svg, size) =>
  sharp(svg, { density: 512 }).resize(size, size, { fit: 'contain' }).png().toBuffer()

await Promise.all([
  writeFile(join(rendererPublicDirectory, 'favicon.svg'), appIconSvg),
  renderPng(appIconSvg, 512).then((data) => writeFile(join(buildDirectory, 'icon.png'), data)),
  renderPng(appIconSvg, 256).then((data) =>
    writeFile(join(resourcesDirectory, 'app-icon.png'), data)
  ),
  renderPng(appIconSvg, 16).then((data) =>
    writeFile(join(rendererPublicDirectory, 'favicon-16x16.png'), data)
  ),
  renderPng(appIconSvg, 32).then((data) =>
    writeFile(join(rendererPublicDirectory, 'favicon-32x32.png'), data)
  ),
  sharp(appIconSvg, { density: 512 })
    .flatten({ background: '#4f72c8' })
    .resize(180, 180, { fit: 'contain' })
    .png()
    .toBuffer()
    .then((data) => writeFile(join(rendererPublicDirectory, 'apple-touch-icon.png'), data)),
  renderPng(trayTemplateSvg, 18).then((data) =>
    writeFile(join(resourcesDirectory, 'trayTemplate.png'), data)
  ),
  renderPng(trayTemplateSvg, 36).then((data) =>
    writeFile(join(resourcesDirectory, 'trayTemplate@2x.png'), data)
  ),
  renderPng(trayWindowsSvg, 32).then((data) =>
    writeFile(join(resourcesDirectory, 'tray-win.png'), data)
  )
])

const icoBuffers = await Promise.all(
  [16, 24, 32, 48, 64, 128, 256].map((size) => renderPng(appIconSvg, size))
)
const ico = await pngToIco(icoBuffers)
await Promise.all([
  writeFile(join(buildDirectory, 'icon.ico'), ico),
  writeFile(join(rendererPublicDirectory, 'favicon.ico'), ico)
])

if (process.platform === 'darwin') {
  await rm(iconsetDirectory, { recursive: true, force: true })
  await mkdir(iconsetDirectory, { recursive: true })
  const iconset = [
    ['icon_16x16.png', 16],
    ['icon_16x16@2x.png', 32],
    ['icon_32x32.png', 32],
    ['icon_32x32@2x.png', 64],
    ['icon_128x128.png', 128],
    ['icon_128x128@2x.png', 256],
    ['icon_256x256.png', 256],
    ['icon_256x256@2x.png', 512],
    ['icon_512x512.png', 512],
    ['icon_512x512@2x.png', 1024]
  ]
  await Promise.all(
    iconset.map(async ([fileName, size]) => {
      await writeFile(join(iconsetDirectory, fileName), await renderPng(appIconSvg, size))
    })
  )
  await execFileAsync('/usr/bin/iconutil', [
    '-c',
    'icns',
    iconsetDirectory,
    '-o',
    join(buildDirectory, 'icon.icns')
  ])
}
