---
id: docker-sandboxes
title: Docker Sandboxes for Agents
code: DS
subtitle: Create, attach, police and serve sandboxed agents with sbx v0.47.0 and docker-agent v1.149.0.
hue: 210
sources: manuals/docker-sandboxes-101
source_hash: 2cc58bf3b3ec7dde
---

## Who owns what
type: architecture
from: manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md, manuals/docker-sandboxes-101/sections/3-1-sbx-diagnose-and-the-microvm-boundary.md, manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md

```arch
node | cli | 1,1 | sbx CLI | create, run, exec | client
node | sbxd | 2,1 | sandboxd | daemon and state | process
node | vm | 3,1 | microVM | guest kernel, Docker Engine | process
node | proxy | 2,2 | Proxy | policy and secrets | process
node | mr | 3,2 | Model Runner | model on the host | model
node | ws | 1,2 | Workspace | virtiofs mount | store
edge | cli | sbxd | socket
edge | sbxd | vm | runs
edge | vm | proxy | HTTP_PROXY
edge | proxy | mr | model call
edge | vm | ws | mount
```

## One sandboxed docker-agent run
type: flow
from: manuals/docker-sandboxes-101/sections/1-2-docker-agent-run-sandbox-end-to-end.md

1. **Allow**: `docker-agent sandbox allow` stores the model host in the persistent allowlist.
2. **Stage**: docker-agent stages the agent file into a kit in the workspace.
3. **Create**: sbx creates `docker-agent-<hash>` with the workspace mounted rw.
4. **Fail**: the session store on the virtiofs mount returns error 1032 and the run exits.
5. **Model call**: `sbx exec` into the same VM answers the task through the proxy.

## Create, attach and remove
type: annotated-code
lang: bash
from: manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md, manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md

```bash
sbx create shell <path> --name <name>   # sandbox on a workspace
sbx run --name <name>                   # attach again
sbx exec <name> <command>               # run one command inside
sbx stop <name>                         # keep state, end the VM
sbx rm --force <name>                   # delete the sandbox
```

## Sandbox lifecycle tasks
type: task-table
from: manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md, manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md, manuals/docker-sandboxes-101/sections/2-3-sbx-template-save-and-load.md

| Task | Code |
|---|---|
| Start from a saved template | `sbx create --pull never -t <tag> shell --name <name>` |
| Copy a file into a sandbox | `sbx cp <file> <name>:<path>` |
| Publish a port on 127.0.0.1 | `sbx ports <name> --publish <host>:<port>` |
| Save a stopped sandbox as a template | `sbx template save <sandbox> <tag> --output <file>` |
| Load a template tar on another host | `sbx template load <file>` |
| Preview a prune | `sbx prune --dry-run --json` |

## Policy, secrets and MCP commands
type: command-table
from: manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md, manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md, manuals/docker-sandboxes-101/sections/3-6-sbx-mcp-add-load-and-static-mcp.md

| Command | What it does |
|---|---|
| `sbx policy init balanced` | Sets the global preset once, before the first sandbox |
| `sbx policy allow network --sandbox <name> <host>` | Adds a rule scoped to one sandbox |
| `sbx policy check network --sandbox <name> <host:port> --json` | Predicts a decision and exits 1 on denial |
| `sbx secret set-custom` | Binds a placeholder to the hosts named by `--host` |
| `sbx mcp load <name> --sandbox <sandbox>` | Adds a registered server to a running sandbox |

## Workspace modes
type: comparison
from: manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md, manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md

| Factor | Bind mount | Clone | Mountless |
|---|---|---|---|
| Create with | `sbx create shell <path>` | `sbx create --clone shell <path>` | `sbx create shell` with no path |
| Agent sees | your files at the same path | a private clone, source read-only | no host bind mount |
| Get commits back | files already on the host | `git fetch sandbox-<name>` | copy out with `sbx cp` |

## Defaults
type: defaults
from: manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md, manuals/docker-sandboxes-101/sections/2-5-sbx-settings-list.md, manuals/docker-sandboxes-101/sections/3-1-sbx-diagnose-and-the-microvm-boundary.md, manuals/docker-sandboxes-101/sections/4-5-sbx-skills-add-and-skills-true.md, manuals/docker-sandboxes-101/sections/5-4-sub-agents-transfer-task-and-background-agents.md

| Setting | Default | Note |
|---|---|---|
| `--memory` | 50% of host memory | Clamped to 512 MiB to 32 GiB |
| `--cpus` | 0 | All host CPUs, at most 16 on Linux arm64 |
| `--pull` | `always` | Also `missing` or `never` |
| `kit.allowedSources` | `["docker.io/"]` | Add a registry prefix to use another source |
| `skills.defaultMode` | `readonly` | Applies to sandboxes created after the change |
| `max_consecutive_tool_calls` | 5 | Identical calls before the run stops |

## Agent and serve tasks
type: task-table
from: manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md, manuals/docker-sandboxes-101/sections/1-2-docker-agent-run-sandbox-end-to-end.md, manuals/docker-sandboxes-101/sections/5-1-docker-agent-run-new-and-doctor.md, manuals/docker-sandboxes-101/sections/5-6-session-db-sessions-diff-and-eval.md, manuals/docker-sandboxes-101/sections/6-4-share-push-and-share-pull.md

| Task | Code |
|---|---|
| Run an agent file headless | `docker-agent run --exec --json <file> <message>` |
| Run an agent in a sandbox | `docker-agent run --sandbox <file>` |
| Allow a host from the VM | `docker-agent sandbox allow <host:port>` |
| Ask which model auto picks | `docker-agent doctor` |
| Compare two sessions | `docker-agent sessions diff -- -1 -2` |
| Push an agent to a registry | `docker-agent share push <file> <ref>` |

## Troubleshooting
type: troubleshooting
from: manuals/docker-sandboxes-101/sections/1-2-docker-agent-run-sandbox-end-to-end.md, manuals/docker-sandboxes-101/sections/2-3-sbx-template-save-and-load.md, manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md, manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md, manuals/docker-sandboxes-101/sections/5-4-sub-agents-transfer-task-and-background-agents.md

| Symptom | Cause | Fix |
|---|---|---|
| `attempt to write a readonly database (1032)` | SQLite cannot write on the virtiofs workspace mount | Probe SQLite on the mount before the run |
| `Blocked by network policy` (403) | The model host is not allowed | `docker-agent sandbox allow <host:port>` |
| `Approval required for example.com:443` | No allow rule covers the host | `sbx policy allow network --sandbox <name> <host>` |
| `cannot save a running sandbox` | Template save needs a stopped sandbox | `sbx stop <name>`, then save again |
| `conflicts with existing allow rule` | A deny meets an allow in the same scope | Remove the allow rule, then add the deny |
| `detected 5 consecutive identical calls` | A call that asks for approval was rejected with no terminal | Add an allow rule for the tool |

## Tips
type: tips
from: manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md, manuals/docker-sandboxes-101/sections/2-4-sandboxd-diagnose-and-reset.md, manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md, manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md

- Name every sandbox with `--name`, so two agents on one directory stay apart.
- Run `sbx policy ls --wide --json` before you trust the preset list.
- Read `sbx diagnose --json` before you file an issue.
- Use `--clone` for any agent you would not trust with `.git/hooks` and build scripts.
