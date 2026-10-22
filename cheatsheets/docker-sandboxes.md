---
id: docker-sandboxes
title: Docker Sandboxes for Agents
code: DS
subtitle: Create, check and remove sbx sandboxes, set policy and secrets, then serve a docker-agent file.
hue: 190
sources: manuals/docker-sandboxes-101
source_hash: 8fc8666f8549cfa0
---

## Layers and doors
type: architecture
from: manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md, manuals/docker-sandboxes-101/capture/out/02-daemon-status.json, manuals/docker-sandboxes-101/capture/out/04-env.txt

```arch
node | host | 1,1 | Host | sbx, docker-agent | client
node | sbxd | 2,1 | sandboxd | daemon, proxy, secrets | process
node | pol | 3,1 | Policy | rules and log | store
node | vm | 2,2 | microVM | guest kernel, agent | process
node | dmr | 3,2 | Model Runner | ai/qwen3:4b on host | model
edge | host | sbxd | sbx verbs
edge | sbxd | vm | microVM
edge | sbxd | pol | check
edge | sbxd | dmr | proxy to localhost:12434
```

## Create and check a sandbox
type: annotated-code
lang: bash
from: manuals/docker-sandboxes-101/capture/out/04-create.txt, manuals/docker-sandboxes-101/capture/out/04-workspace.txt, manuals/docker-sandboxes-101/capture/out/05-ports.txt, manuals/docker-sandboxes-101/capture/out/07-template-save.txt, manuals/docker-sandboxes-101/capture/out/README.md, manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md

```bash
sbx create shell <workspace> --name m101-demo  # new sandbox, workspace mounted rw
sbx run --name m101-demo                       # attach again later
sbx exec m101-demo sh -c 'pwd; ls -la'         # runs as agent, uid 1000
sbx exec -u root m101-demo <command>           # root for package installs
sbx ports m101-demo --publish 18081:8080       # binds 127.0.0.1 as tcp4
sbx ports m101-demo                            # list the bindings
```

## Sandbox tasks
type: task-table
from: manuals/docker-sandboxes-101/capture/out/04-create.txt, manuals/docker-sandboxes-101/capture/out/27-sbx-rm.txt, manuals/docker-sandboxes-101/capture/out/04-prune-dry-run.json, manuals/docker-sandboxes-101/capture/out/06-cp.txt, manuals/docker-sandboxes-101/capture/out/07-template-run.txt, manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md, manuals/docker-sandboxes-101/sections/2-3-sbx-template-save-and-load.md

| Task | Code |
|---|---|
| Start or attach | `sbx run --name <name>` |
| Stop and keep state | `sbx stop <name>` |
| Remove one sandbox | `sbx rm --force <name>` |
| Preview a prune | `sbx prune --dry-run --json` |
| Prune stopped sandboxes | `sbx prune --force` |
| Copy a file out | `sbx cp <name>:/tmp/out.txt <host-path>` |
| Save a template | `sbx template save <name> <tag> --output <file>` |
| Start from a template | `sbx create --pull never -t <tag> shell --name <name>` |

## Policy and secret commands
type: command-table
from: manuals/docker-sandboxes-101/capture/out/README.md, manuals/docker-sandboxes-101/capture/out/03-policy-init.txt, manuals/docker-sandboxes-101/capture/out/09-check-deny.json, manuals/docker-sandboxes-101/capture/out/10-set-custom.txt, manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md, manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md

| Command | What it does |
|---|---|
| `sbx policy init balanced` | Sets the first global policy. Runs once. |
| `sbx policy allow network --sandbox <name> <host>` | Adds an allow rule in one sandbox scope. |
| `sbx policy deny network --sandbox <name> <host>` | Adds a deny rule. Remove a conflicting allow first. |
| `sbx policy check network <host>:443 --sandbox <name> --verbose --json` | Predicts the decision. Exits 1 on a denial. |
| `sbx policy log <name> --json` | One row per host, with proxy path and rule. |
| `sbx secret set-custom --host <host> --env <VAR> --value <value>` | Binds a placeholder to hosts for new sandboxes. |

## Defaults
type: defaults
from: manuals/docker-sandboxes-101/capture/out/02-settings.txt, manuals/docker-sandboxes-101/capture/out/02-settings-get.txt, manuals/docker-sandboxes-101/sections/2-5-sbx-settings-list.md, manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md, manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md, manuals/docker-sandboxes-101/sections/5-2-agents-models-and-providers.md, manuals/docker-sandboxes-101/sections/5-4-sub-agents-transfer-task-and-background-agents.md

| Setting | Default | Note |
|---|---|---|
| `skills.defaultMode` | `readonly` | Mode when `--skills` is omitted |
| `kit.allowedSources` | `["docker.io/"]` | Kit sources the daemon admits |
| `kit.requireSignature` | `false` | Unsigned kits pass |
| `--pull` | `always` | Image pull on `sbx create` |
| `max_consecutive_tool_calls` | `5` | Identical calls before the agent stops |
| `--refresh` | `55 minutes` | Secret cache time |

## One sandboxed agent run
type: flow
from: manuals/docker-sandboxes-101/sections/1-2-docker-agent-run-sandbox-end-to-end.md, manuals/docker-sandboxes-101/capture/out/27-sandbox-allow.txt, manuals/docker-sandboxes-101/capture/out/27-sandbox-run.txt, manuals/docker-sandboxes-101/capture/out/27-sqlite-probe.txt, manuals/docker-sandboxes-101/capture/out/27-inside-run.txt, manuals/docker-sandboxes-101/capture/out/27-sbx-rm.txt

1. **Allow**: `docker-agent sandbox allow localhost:12434` adds the model host to the persistent allowlist.
2. **State**: `--data-dir`, `--cache-dir` and `--config-dir` must sit inside the workspace. A path outside is refused.
3. **Launch**: the summary lists the workspace mounts, the image and the VM size.
4. **Model call**: the proxy turns `host.docker.internal` into `localhost`, and the rule admits it.
5. **Failure**: SQLite cannot write the session store on the virtiofs mount. Exit 1. The VM stays running.
6. **Cleanup**: `sbx rm --force docker-agent-<hash>` removes the VM.

## Agent file commands
type: annotated-code
lang: bash
from: manuals/docker-sandboxes-101/capture/out/README.md, manuals/docker-sandboxes-101/capture/out/18-run-last.txt, manuals/docker-sandboxes-101/capture/out/20-restricted.ndjson, manuals/docker-sandboxes-101/capture/out/23-api.http, manuals/docker-sandboxes-101/capture/out/23-chat.http, manuals/docker-sandboxes-101/sections/6-1-serve-api-and-serve-chat.md

```bash
docker-agent doctor                                   # auto model and runner status
docker-agent run --exec --last <agent.yaml> '<message>'   # final answer only
docker-agent run --exec --json --safety restricted <agent.yaml> '<message>'  # event per line
docker-agent serve api <agent.yaml> --listen 127.0.0.1:8080 -s <db>  # sessions and SSE
docker-agent serve chat <agent.yaml> --listen 127.0.0.1:8083 --api-key <key>  # OpenAI format
```

## docker-agent commands
type: command-table
from: manuals/docker-sandboxes-101/capture/out/README.md, manuals/docker-sandboxes-101/capture/out/21-sessions-diff.txt, manuals/docker-sandboxes-101/capture/out/27-sandbox-run.txt, manuals/docker-sandboxes-101/sections/5-1-docker-agent-run-new-and-doctor.md, manuals/docker-sandboxes-101/sections/5-6-session-db-sessions-diff-and-eval.md

| Command | What it does |
|---|---|
| `docker-agent doctor` | Shows the `auto` model and the Model Runner status. |
| `docker-agent run --sandbox --exec <agent.yaml> '<message>'` | Runs tools in a microVM. The model stays on the host. |
| `docker-agent sandbox allow localhost:12434` | Adds a host to the persistent allowlist. |
| `docker-agent sessions diff --fail-on-divergence -- -1 -3` | Exits 1 at the first differing tool call. |

## Troubleshooting
type: troubleshooting
from: manuals/docker-sandboxes-101/capture/out/07-template-save.txt, manuals/docker-sandboxes-101/capture/out/27-data-dir-outside.txt, manuals/docker-sandboxes-101/capture/out/09-blocked.txt, manuals/docker-sandboxes-101/capture/out/21-sessions-diff.txt, manuals/docker-sandboxes-101/sections/2-3-sbx-template-save-and-load.md, manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md, manuals/docker-sandboxes-101/sections/1-2-docker-agent-run-sandbox-end-to-end.md, manuals/docker-sandboxes-101/sections/5-6-session-db-sessions-diff-and-eval.md

| Symptom | Cause | Fix |
|---|---|---|
| `cannot save a running sandbox` | Template save needs a stopped sandbox | Run `sbx stop <name>`, then save |
| `Approval required` with a 403 body | No allow rule for the host | `sbx policy allow network --sandbox <name> <host>` |
| `--data-dir must be inside the sandbox's writable workspace` | Data directory outside the mount | Put `--data-dir` under the workspace |
| `Error: unknown shorthand flag: '1' in -1` | Parser reads `-1` as a flag | Put `--` before the session references |

## Questions
type: qa
from: manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md, manuals/docker-sandboxes-101/sections/5-5-permissions-safety-and-hooks.md, manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md

- **Why use `--clone`?** The agent cannot change `.git/hooks` or build scripts in your repository.
- **Is an unknown call denied in restricted mode?** Yes. The `restricted` mode denies calls with label `unknown` and `destructive`.
- **Why does a re-attach ignore `-p`?** Flags such as `-p` act at creation only.

## Tips
type: tips
from: manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md, manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md, manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md

- Run `sbx diagnose` first, and read the Virtualization line.
- Name every sandbox with `--name`, so two agents on one directory stay apart.
- Run `sbx policy init balanced` once, then read `sbx policy ls --wide --json`.
- Store keys with `sbx secret set`. Exporting a key in your shell does not reach the VM.
- Pass `--` before negative session references.
