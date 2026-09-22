// The control: a plain fork, which is what local-runner does when xvfb-run is absent
// (@wdio/xvfb ProcessFactory#createRegularProcess). This passes on every image.
//
//   node parent-fork.mjs [worker count]
import { fork } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const count = Number(process.argv[2] ?? 1)
const childPath = fileURLToPath(new URL('./child.mjs', import.meta.url))

console.log(`parent: node ${process.version} forking ${count} child(ren)`)

let failed = 0
let done = 0

for (let i = 0; i < count; i++) {
  // local-runner passes this exact stdio array (index.js:277).
  const child = fork(childPath, [], { stdio: ['inherit', 'pipe', 'pipe', 'ipc'] })

  child.stdout?.on('data', (d) => process.stdout.write(`[${i}] ${d}`))
  child.stderr?.on('data', (d) => process.stdout.write(`[${i}!] ${d}`))
  child.on('message', (m) => console.log(`[${i}] parent got`, JSON.stringify(m)))
  child.on('error', (e) => console.log(`[${i}] parent: child error ${e.code} ${e.message}`))
  child.on('exit', (code) => {
    if (code !== 0) { failed++; console.log(`[${i}] parent: child exited ${code}`) }
    if (++done === count) {
      console.log(`parent: ${count - failed}/${count} children sent cleanly`)
      process.exit(failed === 0 ? 0 : 1)
    }
  })
}
