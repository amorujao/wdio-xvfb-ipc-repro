// Mirrors what @wdio/local-runner/build/run.js:17-21 does as its first act: tell the
// parent it is ready, over the fork IPC channel.
console.log('child: typeof process.send =', typeof process.send)
process.send({ name: 'ready', origin: 'worker' })
console.log('child: send returned')
