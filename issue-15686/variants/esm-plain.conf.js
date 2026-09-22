// Control. This one honours autoXvfb: false.
export const config = {
  runner: 'local',
  specs: ['../test/*.spec.js'],
  maxInstances: 1,
  capabilities: [{ browserName: 'chrome' }],
  framework: 'mocha',
  reporters: ['spec'],
  autoXvfb: false,
  logLevel: 'info',
}
