# wdio xvfb / worker IPC reproductions

Minimal, runnable reproductions for two WebdriverIO bugs, both in how
`@wdio/local-runner` starts its workers on Linux:

| issue | what it shows |
| --- | --- |
| [webdriverio/webdriverio#15685](https://github.com/webdriverio/webdriverio/issues/15685) | Every worker dies with `write EINVAL` on Ubuntu 26.04, because `xvfb-run` does not carry the IPC fd through its exec into `node` |
| [webdriverio/webdriverio#15686](https://github.com/webdriverio/webdriverio/issues/15686) | `autoXvfb: false` does not stop workers being spawned through `xvfb-run` |

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

## #15686 — `autoXvfb: false` is ignored

`issue-15686/` is a WebdriverIO project whose config sets `autoXvfb: false` and
`logLevel: 'info'`.

```bash
cd issue-15686
npm install
npx wdio run ./wdio.conf.js
```

**Expected:** `shouldRun=false`, and the worker started with a plain fork.

**Observed:**

```
ProcessFactory: shouldRun=true, isAvailable=true
Creating worker process with xvfb-run wrapper and retry logic
```

with `Skipping automatic Xvfb initialization (disabled by config)` never logged — so
the flag is not reaching `XvfbManager` at all. The workflow also prints the resolved
`ConfigParser` value (`false`, as it should be) and the line in the installed
`@wdio/local-runner` that reads it, to show the two do not meet.

It runs on `ubuntu-24.04` deliberately: there `xvfb-run` still carries the fd, so
\#15685 stays out of the way and the ignored flag is the only thing on show.

## Why it matters together

`ubuntu-latest` moves to 26.04 between 2026-10-19 and 2026-11-19
([actions/runner-images#14748](https://github.com/actions/runner-images/issues/14748)).
When it does, #15685 breaks every Linux suite whose capabilities do not name a local
browser — Appium, cloud device farms, anything remote — and #15686 means the
documented way out does not work. Setting a non-empty `DISPLAY` is the only
workaround, since it makes `shouldRun()` false through the other half of the same
check.
