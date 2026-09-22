// A service whose launcher half mutates the config object in onPrepare, which is what
// a real service does before any worker is spawned.
class MutatingService {
  onPrepare(config) {
    config.baseUrl = 'https://example.com'
    config.someServiceKey = true
  }
}

export const config = {
  runner: 'local',
  specs: ['../test/*.spec.js'],
  maxInstances: 1,
  capabilities: [{ browserName: 'chrome' }],
  framework: 'mocha',
  reporters: ['spec'],
  services: [[MutatingService, {}]],
  autoXvfb: false,
  logLevel: 'info',
}
