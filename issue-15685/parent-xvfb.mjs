// The failing case: the same child, spawned through xvfb-run, which is what
// local-runner does whenever xvfb-run is on PATH (@wdio/xvfb/build/index.js:396):
//
//   spawn('xvfb-run', ['--auto-servernum', '--', 'node', ...nodeArgs],
//         { cwd, env, stdio: ['inherit', 'pipe', 'pipe', 'ipc'] })
//
// The IPC channel sits on fd 3 and has to survive xvfb-run's exec into node.
//
//   node parent-xvfb.mjs
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const childPath = fileURLToPath(new URL('./child.mjs', import.meta.url))

console.log(`parent: node ${process.version} spawning child through xvfb-run`)

const child = spawn(
  'xvfb-run', ['--auto-servernum', '--', 'node', childPath],
  { stdio: ['inherit', 'pipe', 'pipe', 'ipc'] },
)

child.stdout?.on('data', (d) => process.stdout.write(`[out] ${d}`))
child.stderr?.on('data', (d) => process.stdout.write(`[err] ${d}`))
child.on('message', (m) => console.log('parent: got message', JSON.stringify(m)))
child.on('error', (e) => console.log('parent: child error', e.code, e.message))
child.on('exit', (code) => {
  console.log(`parent: child exited ${code}`)
  process.exit(code === 0 ? 0 : 1)
})
