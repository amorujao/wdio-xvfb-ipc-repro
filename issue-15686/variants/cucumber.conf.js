// Same flag, but the cucumber framework, so a --cucumberOpts.* argument can be passed
// on the command line the way a tag-filtered suite does.
export const config = {
  runner: 'local',
  specs: ['../features/*.feature'],
  maxInstances: 1,
  capabilities: [{ browserName: 'chrome' }],
  framework: 'cucumber',
  reporters: ['spec'],
  cucumberOpts: {
    require: ['./features/step-definitions/*.js'],
    tags: '',
  },
  autoXvfb: false,
  logLevel: 'info',
}
