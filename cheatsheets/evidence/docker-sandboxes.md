# Evidence: cheatsheets/docker-sandboxes.md

Abbreviations: A = manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md, B = manuals/docker-sandboxes-101/sections/1-2-docker-agent-run-sandbox-end-to-end.md, C = manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md, D = manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md, E = manuals/docker-sandboxes-101/sections/2-3-sbx-template-save-and-load.md, F = manuals/docker-sandboxes-101/sections/2-5-sbx-settings-list.md, G = manuals/docker-sandboxes-101/sections/3-1-sbx-diagnose-and-the-microvm-boundary.md, H = manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md, I = manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md, J = manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md, K = manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md, L = manuals/docker-sandboxes-101/sections/3-6-sbx-mcp-add-load-and-static-mcp.md, M = manuals/docker-sandboxes-101/sections/4-5-sbx-skills-add-and-skills-true.md, N = manuals/docker-sandboxes-101/sections/5-1-docker-agent-run-new-and-doctor.md, O = manuals/docker-sandboxes-101/sections/5-4-sub-agents-transfer-task-and-background-agents.md, P = manuals/docker-sandboxes-101/sections/5-6-session-db-sessions-diff-and-eval.md, Q = manuals/docker-sandboxes-101/sections/6-4-share-push-and-share-pull.md, R = manuals/docker-sandboxes-101/sections/2-4-sandboxd-diagnose-and-reset.md.

## Architecture: Who owns what (6 nodes, 5 edges)
- sbx CLI with create, run, exec: A:11
- sandboxd daemon and state: A:13
- microVM with guest kernel and Docker Engine: G:9
- Proxy with policy and secrets: J:30
- Model Runner model on the host: B:62
- Workspace virtiofs mount: C:40

## Flow: One sandboxed docker-agent run (5 steps)
1. docker-agent sandbox allow stores the host: B:62-72
2. docker-agent stages a kit: B:30
3. sbx creates docker-agent-<hash> with workspace rw: B:95-115
4. error 1032 ends the run: B:130-142
5. sbx exec answers through the proxy: B:150-165

## Create, attach and remove (annotated-code, 5 lines)
- sbx create shell <path> --name <name>: C:20-40
- sbx run --name <name> reattaches: C:55-62
- sbx exec <name> <command>: D:30-40
- sbx stop <name> keeps state: C:150-160
- sbx rm --force <name> deletes: C:170-180

## Sandbox lifecycle tasks (task-table, 6 rows)
- sbx create --pull never -t <tag> shell --name <name>: E:95-110
- sbx cp <file> <name>:<path>: D:40-50
- sbx ports <name> --publish <host>:<port>: D:60-100
- sbx template save <sandbox> <tag> --output <file>: E:40-60
- sbx template load <file>: E:100-115
- sbx prune --dry-run --json: C:150-175

## Policy, secrets and MCP commands (command-table, 5 rows)
- sbx policy init balanced: I:20-30
- sbx policy allow network --sandbox <name> <host>: I:45-55
- sbx policy check network --sandbox <name> <host:port> --json, exit 1 on denial: I:110-130
- sbx secret set-custom with --host: K:45-55
- sbx mcp load <name> --sandbox <sandbox>: L:90-100

## Workspace modes (comparison, 3 rows)
- Create with: sbx create shell <path>, sbx create --clone shell <path>: H:40, C:45-65
- Agent sees: files at same path, private clone with read-only source: H:30-35, H:70-80
- Get commits back: git fetch sandbox-<name>: H:50-70

## Defaults (defaults, 6 rows)
- --memory 50% of host memory, 512 MiB to 32 GiB: G:70-75
- --cpus 0 means all host CPUs, at most 16 on Linux arm64: G:80
- --pull always: C:25-35
- kit.allowedSources ["docker.io/"]: F:40-45
- skills.defaultMode readonly: M:50-55
- max_consecutive_tool_calls 5: O:110-120

## Agent and serve tasks (task-table, 6 rows)
- docker-agent run --exec --json <file> <message>: N:20-40
- docker-agent run --sandbox <file>: A:80-90
- docker-agent sandbox allow <host:port>: B:60-70
- docker-agent doctor: N:110-120
- docker-agent sessions diff -- -1 -2: P:70-80
- docker-agent share push <file> <ref>: Q:20-30

## Troubleshooting (troubleshooting, 6 rows)
- attempt to write a readonly database (1032), probe SQLite: B:110-120
- Blocked by network policy (403), docker-agent sandbox allow: B:70
- Approval required for example.com:443, sbx policy allow network: J:20-30
- cannot save a running sandbox, sbx stop then save: E:30
- conflicts with existing allow rule, remove allow then deny: I:60-70
- detected 5 consecutive identical calls, add allow rule: O:90-100

## Tips (tips, 4 bullets)
- --name keeps sandboxes apart: C:10-20
- sbx policy ls --wide --json before trusting the preset: I:60-70
- sbx diagnose --json before filing an issue: R:90-100
- --clone for an agent not trusted with .git/hooks: H:15-20
