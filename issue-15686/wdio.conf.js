export const config = {
  runner: 'local',
  specs: ['./test/*.spec.js'],
  maxInstances: 1,
  capabilities: [{ browserName: 'chrome' }],
  framework: 'mocha',
  reporters: ['spec'],

  // The point of this project. Per the docs this disables @wdio/xvfb, so the worker
  // should be spawned with a plain fork. Run at info level and the log says otherwise:
  //
  //   ProcessFactory: shouldRun=true, isAvailable=true
  //   Creating worker process with xvfb-run wrapper and retry logic
  //
  // and "Skipping automatic Xvfb initialization (disabled by config)" never appears.
  autoXvfb: false,

  // Needed to see ProcessFactory's decision at all — it logs at info.
  logLevel: 'info',
}
