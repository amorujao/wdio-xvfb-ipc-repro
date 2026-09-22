// The closest variant to the real config that loses the flag: a real third-party
// service in the services list rather than the stub in esm-service.conf.js.
// Credentials are dummies on purpose — the service logs its failures and the run
// carries on, and the worker is spawned either way, which is all that is measured.
export const config = {
  runner: 'local',
  specs: ['../test/*.spec.js'],
  maxInstances: 1,
  user: 'dummy_user',
  key: 'dummy_key',
  capabilities: [{ browserName: 'chrome' }],
  framework: 'mocha',
  reporters: ['spec'],
  services: [['browserstack', {}]],
  autoXvfb: false,
  logLevel: 'info',
}
