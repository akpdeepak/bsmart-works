# `works` — bSmart Works CLI

Terminal interface for bSmart Works (iteration 14, Cap U). Transitions, comments, search, standup
and inline commit linking from the shell — for power users who live in the terminal.

Zero dependencies (Node ≥ 18, built-in `fetch`). It is a thin client over the same `/api/v1` REST
surface the web app and IDE extensions use, so the backend owns RBAC, tenant isolation and the AI
Control Plane.

## Install

```bash
cd tools/works-cli
npm link          # exposes `works` on your PATH (or run `node works.js …`)
```

## Authenticate

```bash
works login --token "<JWT>" --workspace WS-001
# or set env vars: WORKS_TOKEN, WORKS_WORKSPACE, WORKS_API_BASE
```

Credentials are saved to `~/.works/config.json`.

## Commands

| Command | What it does |
|---------|--------------|
| `works mine` | Your in-progress work items |
| `works review` | Your code-review queue (urgency-ranked) |
| `works standup` | Draft your standup from work + git activity |
| `works velocity` | Your **private** personal velocity (never shown to a manager) |
| `works view WRK-1` | Show a work item |
| `works transition WRK-1 "In Progress"` | Move a work item to a new status |
| `works link WRK-1 --kind commit --ref a1b2c3d -m "fix CSRF"` | Link a commit/branch/PR to a work item |
| `works focus start "Deep work" --mins 90` | Schedule a focus block now (`--no-p0` to mute P0 too) |
| `works help` | Usage |

## Git hook example — auto-link commits

Drop this in `.git/hooks/post-commit` to link every commit to the work item named in its message:

```bash
#!/usr/bin/env bash
msg=$(git log -1 --pretty=%B)
sha=$(git rev-parse --short HEAD)
item=$(printf '%s' "$msg" | grep -oE '[A-Z]+-[0-9]+' | head -1)
[ -n "$item" ] && works link "$item" --kind commit --ref "$sha" -m "$msg"
```

## Test

```bash
npm test    # node --test — covers the arg parser
```
