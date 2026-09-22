// The candidate fix for #15685.
//
// xvfb-run takes fd 3 for its own logging and then closes it before running the
// command:
//
//   exec 3>&1                 # ...or 3>&2, or 3>>"$ERRORFILE"
//   DISPLAY=:$N XAUTHORITY=$AUTHFILE "$@" 3>&-
//
// Node puts the IPC channel at the first stdio slot after 0/1/2 — fd 3 — and sets
// NODE_CHANNEL_FD to match, so the worker inherits a channel pointing at a descriptor
// xvfb-run has clobbered and closed. That is the EINVAL.
//
// Padding the stdio array with one 'ignore' before the 'ipc' slot moves the channel to
// fd 4, which xvfb-run never touches. NODE_CHANNEL_FD follows the slot, so nothing else
// has to change.
//
//   node parent-xvfb-padded.mjs
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const childPath = fileURLToPath(new URL('./child.mjs', import.meta.url))

// What local-runner passes today.
const stdio = ['inherit', 'pipe', 'pipe', 'ipc']

// The fix: keep 0/1/2 as they are, then push everything else out by one.
const padded = stdio.includes('ipc')
  ? [...stdio.slice(0, 3), 'ignore', ...stdio.slice(3)]
  : stdio

console.log(`parent: node ${process.version} spawning through xvfb-run`)
console.log(`parent: stdio ${JSON.stringify(stdio)} -> ${JSON.stringify(padded)}`)

const child = spawn(
  'xvfb-run', ['--auto-servernum', '--', 'node', childPath],
  { stdio: padded },
)

child.stdout?.on('data', (d) => process.stdout.write(`[out] ${d}`))
child.stderr?.on('data', (d) => process.stdout.write(`[err] ${d}`))
child.on('message', (m) => console.log('parent: got message', JSON.stringify(m)))
child.on('error', (e) => console.log('parent: child error', e.code, e.message))
child.on('exit', (code) => {
  console.log(`parent: child exited ${code}`)
  process.exit(code === 0 ? 0 : 1)
})
