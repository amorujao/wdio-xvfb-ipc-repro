// Mirrors the shape of the config that does NOT honour the flag: CommonJS, and an
// object defined once then mutated by the product-specific file before being exported.
const config = {
  runner: 'local',
  specs: ['../test/*.spec.js'],
  maxInstances: 1,
  framework: 'mocha',
  reporters: ['spec'],
  autoXvfb: false,
  logLevel: 'info',
}

// the "product config" half
config.capabilities = [{ browserName: 'chrome' }]
config.baseUrl = 'https://example.com'

exports.config = config
