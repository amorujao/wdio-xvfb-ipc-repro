# wdio xvfb / worker IPC reproductions

Minimal, runnable reproductions for two WebdriverIO bugs, both in how
`@wdio/local-runner` starts its workers on Linux:

| issue | what it shows |
| --- | --- |
| [webdriverio/webdriverio#15685](https://github.com/webdriverio/webdriverio/issues/15685) | Every worker dies with `write EINVAL` on Ubuntu 26.04, because `xvfb-run` does not carry the IPC fd through its exec into `node` |
| [webdriverio/webdriverio#15686](https://github.com/webdriverio/webdriverio/issues/15686) | **Closed, not reproducible.** `autoXvfb: false` was reported as ignored; it is honoured in every configuration tried here |

Both reproduce on GitHub-hosted runners. Push to this repo, or run the two workflows
from the Actions tab, and read the verdict lines.

## Background

`@wdio/local-runner` does not always `fork` its workers. Whenever `xvfb-run` is on
`PATH` and `XvfbManager.shouldRun()` says so — which on Linux means only "no
`DISPLAY`, and no capability naming a headless browser" — `@wdio/xvfb`'s
`ProcessFactory` spawns the worker through a wrapper instead
(`@wdio/xvfb/build/index.js:396`):

```js
spawn('xvfb-run', ['--auto-servernum', '--', 'node', ...nodeArgs],
      { cwd, env, stdio: ['inherit', 'pipe', 'pipe', 'ipc'] })
```

The IPC channel is on fd 3, and `run.js:17-21` writes to it as the worker's first act.
Everything below follows from whether that fd survives.

## #15685 — `xvfb-run` breaks worker IPC on Ubuntu 26.04

`issue-15685/` holds a child that calls `process.send()` once, and two parents that
start it: one with a plain `fork`, one through `xvfb-run`. No WebdriverIO involved.

```bash
node issue-15685/parent-fork.mjs 25   # control
node issue-15685/parent-xvfb.mjs      # the bug
```

**Expected:** both print `got message {"name":"ready","origin":"worker"}` and exit 0.

**Observed on `ubuntu-26.04`:** the `fork` parent is fine; the `xvfb-run` parent dies.

```
Error: write EINVAL
    at target._send (node:internal/child_process:917:20)
    at target.send (node:internal/child_process:792:19)
  errno: -22, code: 'EINVAL', syscall: 'write'
```

The workflow runs both across `ubuntu-24.04` and `ubuntu-26.04`, node 22 and 24, with
1 and 25 concurrent workers. Only one variable changes the outcome:

| image | xvfb | plain fork | through xvfb-run |
| --- | --- | --- | --- |
| ubuntu-24.04 | `2:21.1.12-1ubuntu1.6` | passes | passes |
| ubuntu-26.04 | `2:21.1.22-1ubuntu1` | passes | **`write EINVAL`** |

In a real suite this means every worker dies before its first spec and the run
produces no results at all.

## #15686 — `autoXvfb: false` is ignored — NOT REPRODUCIBLE

**This one was closed.** It was filed from CI logs of a real suite where
`ConfigParser` resolved `autoXvfb` to `false` and the runner still logged
`shouldRun=true` for every worker. It does not reproduce here, and the issue should
not have been filed before it had been isolated. The project and the matrix are kept
as evidence of what was ruled out.

`issue-15686/` is a WebdriverIO project with `autoXvfb: false` and
`logLevel: 'info'`. Its workflow runs one cell per way a real config can differ from
the minimal one:

| cell | what it varies | result |
| --- | --- | --- |
| `esm-plain` | control | flag honoured, regular fork |
| `cjs-shared` | CommonJS, object mutated by a second file before export | flag honoured |
| `esm-service` | a launcher service mutating config in `onPrepare` | flag honoured |
| `esm-bs-service` | a real third-party service | flag honoured |
| `cucumber-noargs` | the cucumber framework | flag honoured |
| `cucumber-cli-tags` | `wdio run … --cucumberOpts.tags=@smoke` | flag honoured |
| `esm-cli-loglevel` | `wdio run … --logLevel info` | flag honoured |

Every cell logs:

```
@wdio/xvfb:ProcessFactory: ProcessFactory: shouldRun=false, isAvailable=true
@wdio/xvfb:ProcessFactory: Creating worker process with regular fork
```

`@wdio/local-runner` 9.29.1 also reads the option in the same two places as 9.31.9
and 9.32.0, so a stale install does not explain it either.

The cells run on `ubuntu-24.04` deliberately: there `xvfb-run` still carries the IPC
fd, so #15685 stays out of the way and the only thing on show is which path was
chosen. The Chrome session always fails — with xvfb genuinely disabled there is no
display — and that is irrelevant, because the decision is logged before any session
is created.

## Why it matters together

`ubuntu-latest` moves to 26.04 between 2026-10-19 and 2026-11-19
([actions/runner-images#14748](https://github.com/actions/runner-images/issues/14748)).
When it does, #15685 breaks every Linux suite whose capabilities do not name a local
browser — Appium, cloud device farms, anything remote. Two ways out: `autoXvfb: false`,
or a non-empty `DISPLAY`, which makes `shouldRun()` false through the other half of
the same check.
