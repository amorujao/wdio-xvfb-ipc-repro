// Deliberately trivial. The bug shows in how the worker is spawned, which happens
// before anything in here runs, so it does not matter what the test does.
describe('a worker', () => {
  it('gets spawned', () => {})
})
