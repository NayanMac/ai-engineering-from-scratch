---
id: docker-sandboxes
title: Docker Sandboxes for Agents
code: DS
subtitle: Run, isolate and serve agents with sbx v0.47.0 and docker-agent v1.149.0. Commands, defaults and incidents.
hue: 200
sources: manuals/docker-sandboxes-101
source_hash: 8fc8666f8549cfa0
---

## Layers and doors
type: architecture
from: manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md, manuals/docker-sandboxes-101/sections/3-1-sbx-diagnose-and-the-microvm-boundary.md, manuals/docker-sandboxes-101/sections/1-2-docker-agent-run-sandbox-end-to-end.md, manuals/docker-sandboxes-101/capture/out/04-guest.txt, manuals/docker-sandboxes-101/capture/out/02-daemon-status.json

```arch
node | host | 1,1 | Your Mac | sbx, docker-agent | client
node | sbxd | 2,1 | sandboxd | socket, log, policy | process
node | proxy | 3,1 | Proxy | allow, deny, secrets | process
node | agent | 1,2 | docker-agent | loop and tools | process
node | vm | 2,2 | microVM | Linux 7.0.14 | process
node | dmr | 3,2 | Model Runner | ai/qwen3:4b, port 12434 | model
edge | host | sbxd | create
edge | sbxd | vm | boots
edge | vm | proxy | egress
edge | proxy | dmr | model call
edge | agent | vm | runs in
```

## Sandbox tasks
type: task-table
from: manuals/docker-sandboxes-101/capture/out/04-create.txt, manuals/docker-sandboxes-101/capture/out/04-env.txt, manuals/docker-sandboxes-101/capture/out/05-ports.txt, manuals/docker-sandboxes-101/capture/out/06-cp.txt, manuals/docker-sandboxes-101/capture/out/09-allow.txt, manuals/docker-sandboxes-101/capture/out/10-set-custom.txt, manuals/docker-sandboxes-101/capture/out/07-template-save.txt, manuals/docker-sandboxes-101/capture/out/27-sandbox-allow.txt

| Task | Code |
|---|---|
| Create a named sandbox | `sbx create shell <workspace> --name <name>` |
| Run a command in it | `sbx exec <name> sh -c '<command>'` |
| Publish a port on tcp4 | `sbx ports <name> --publish <host>:<port>` |
| Copy a file out | `sbx cp <name>:<path> <host file>` |
| Allow one host | `sbx policy allow network --sandbox <name> <host>` |
| Store a custom secret | `sbx secret set-custom --host <host> --env <VAR> --value <value>` |
| Save a stopped sandbox | `sbx template save <name> <tag> --output <file>` |
| Allow a host for docker-agent | `docker-agent sandbox allow <host:port>` |

## Lifecycle in order
type: annotated-code
lang: bash
from: manuals/docker-sandboxes-101/capture/out/04-create.txt, manuals/docker-sandboxes-101/capture/out/04-env.txt, manuals/docker-sandboxes-101/capture/out/05-ports.txt, manuals/docker-sandboxes-101/capture/out/04-stop.txt, manuals/docker-sandboxes-101/capture/out/27-sbx-rm.txt

```bash
sbx create shell $CAPTURE/fixtures/repo --name m101-demo  # one workspace, one name
sbx exec m101-demo sh -c 'env | sort'  # identity and proxy variables
sbx ports m101-demo --publish 18081:8080  # binds 127.0.0.1 as tcp4
sbx stop m101-demo-2  # keeps the state
sbx rm --force docker-agent-<hash>  # deletes the sandbox
```

## Who owns what
type: concepts
from: manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md, manuals/docker-sandboxes-101/sections/3-1-sbx-diagnose-and-the-microvm-boundary.md, manuals/docker-sandboxes-101/capture/out/04-guest.txt

- **sbx**: owns the microVM, its proxy and its secret store.
- **sandboxd**: the host daemon behind every local sbx command.
- **docker-agent**: owns the loop between a model, tools and sub-agents.
- **Guest**: Linux 7.0.14 with Docker Engine 29.8.1 inside the VM.

## run --sandbox, step by step
type: flow
from: manuals/docker-sandboxes-101/sections/1-2-docker-agent-run-sandbox-end-to-end.md, manuals/docker-sandboxes-101/capture/out/27-sandbox-allow.txt, manuals/docker-sandboxes-101/capture/out/27-data-dir-outside.txt, manuals/docker-sandboxes-101/capture/out/27-sandbox-run.txt, manuals/docker-sandboxes-101/capture/out/27-inside-run.txt, manuals/docker-sandboxes-101/capture/out/27-sbx-rm.txt

1. **Allow**: `docker-agent sandbox allow localhost:12434` admits the model host.
2. **State**: keep `--data-dir` inside the workspace, or the run stops.
3. **Launch**: the summary lists mounts, the image, cpu 10 and memory 32 GiB.
4. **Store**: SQLite on the virtiofs mount fails with error 1032.
5. **Inside**: the VM reaches the model through the proxy, then `sbx rm --force` removes it.

## docker-agent commands
type: command-table
from: manuals/docker-sandboxes-101/sections/5-1-docker-agent-run-new-and-doctor.md, manuals/docker-sandboxes-101/sections/5-5-permissions-safety-and-hooks.md, manuals/docker-sandboxes-101/sections/6-1-serve-api-and-serve-chat.md

| Command | What it does |
|---|---|
| `docker-agent doctor` | Says which model `auto` picks. |
| `docker-agent run --exec --json` | One JSON event per line, no TUI. |
| `docker-agent run --safety restricted` | Unmatched calls that are not safe fail closed. |
| `docker-agent serve api` | Sessions and an SSE run stream on port 8080. |
| `docker-agent serve chat` | OpenAI-compatible API on port 8083. |

## Defaults
type: defaults
from: manuals/docker-sandboxes-101/capture/out/04-create.txt, manuals/docker-sandboxes-101/capture/README.md, manuals/docker-sandboxes-101/capture/out/03-policy-init.txt, manuals/docker-sandboxes-101/capture/out/02-settings.json, manuals/docker-sandboxes-101/sections/6-1-serve-api-and-serve-chat.md

| Setting | Default | Note |
|---|---|---|
| `cpu` | 10 | Recording Mac, sbx create |
| `memory` | 32 GiB | Recording Mac, sbx create |
| Template image | `docker/sandbox-templates:shell-docker` | Shell with Docker Engine |
| Auto-stop | 30 seconds | After the last session ends |
| Policy preset | `balanced` | Set once by policy init |
| `skills.defaultMode` | `readonly` | Shared store, linked read-only |

## Workspace modes
type: comparison
from: manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md, manuals/docker-sandboxes-101/capture/out/08-clone-host.txt, manuals/docker-sandboxes-101/capture/out/04-workspace.txt

| Factor | Bind | Mountless | Clone |
|---|---|---|---|
| Host files | Same path, rw | None | Copy of the repo |
| Agent writes | Your files | Template directory | Clone only |
| Commits back | Not needed | Not needed | Fetch `sandbox-<name>` |

## Troubleshooting
type: troubleshooting
from: manuals/docker-sandboxes-101/sections/1-2-docker-agent-run-sandbox-end-to-end.md, manuals/docker-sandboxes-101/capture/out/27-data-dir-outside.txt, manuals/docker-sandboxes-101/capture/out/27-sandbox-run.txt, manuals/docker-sandboxes-101/capture/out/07-template-save.txt, manuals/docker-sandboxes-101/capture/out/06-cp.txt, manuals/docker-sandboxes-101/capture/out/09-blocked.txt

| Symptom | Cause | Fix |
|---|---|---|
| `403 Blocked by network policy` | Host not allowed | `docker-agent sandbox allow <host:port>` |
| `--data-dir must be inside the sandbox's writable workspace` | State outside the mount | Put `--data-dir` under the workspace |
| `attempt to write a readonly database (1032)` | SQLite on virtiofs | Remove with `sbx rm --force` |
| `cannot save a running sandbox` | Sandbox still running | `sbx stop <name>`, then save |
| `copying between sandboxes is not supported` | Two sandboxes in one cp | Copy through the host |
| `Approval required for example.com:443.` | No allow rule | `sbx policy allow network --sandbox <name> <host>` |

## Glossary
type: glossary
from: manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md, manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md, manuals/docker-sandboxes-101/capture/out/04-env.txt

- **sandboxd**: the host daemon that every local sbx command uses.
- **proxy-managed**: the sentinel the VM sees instead of an API key.
- **sbx-cs-<rand>**: the placeholder of a custom secret.
- **DMR**: Docker Model Runner, on localhost port 12434.

## Questions and answers
type: qa
from: manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md, manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md, manuals/docker-sandboxes-101/sections/5-6-session-db-sessions-diff-and-eval.md

- **Why is check network not enough?** It checks the network only, not the method or path.
- **Why does a custom secret miss an old sandbox?** Custom variables reach new sandboxes only.
- **Why does sessions diff fail on -1 -2?** Put `--` first, so -1 is read as a reference.

## Tips
type: tips
from: manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md, manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md, manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md, manuals/docker-sandboxes-101/sections/5-5-permissions-safety-and-hooks.md

- Name every sandbox, so two agents on one directory stay apart.
- Read `sbx policy ls --wide --json` before you trust a preset.
- Turn off `ssh.agentForwardingEnabled` for an agent you would not let sign with your key.
- Run unattended agents with `--safety restricted`.
