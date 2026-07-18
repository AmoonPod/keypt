// @ts-check

import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const executable = process.env.KEYPT_PACKAGE_EXECUTABLE
if (!executable) throw new Error('Set KEYPT_PACKAGE_EXECUTABLE to a packaged Keypt executable.')

const userData = await mkdtemp(join(tmpdir(), 'keypt-package-smoke-'))
const output = []
const child = spawn(resolve(executable), [`--user-data-dir=${userData}`], {
  shell: false,
  stdio: ['ignore', 'pipe', 'pipe']
})

child.stdout?.on('data', (chunk) => output.push(chunk.toString()))
child.stderr?.on('data', (chunk) => output.push(chunk.toString()))

const exit = new Promise((resolveExit, reject) => {
  child.once('error', reject)
  child.once('exit', (code, signal) => resolveExit({ code, signal }))
})

try {
  const outcome = await Promise.race([
    exit,
    new Promise((resolveDelay) => setTimeout(() => resolveDelay('running'), 5_000))
  ])
  if (outcome !== 'running') {
    throw new Error(
      `Keypt exited during package smoke test: ${JSON.stringify(outcome)}\n${output.join('')}`
    )
  }
  process.stdout.write('Packaged Keypt remained healthy for the five-second launch smoke test.\n')
} finally {
  child.kill()
  await Promise.race([exit, new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000))])
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  await rm(userData, { recursive: true, force: true })
}
