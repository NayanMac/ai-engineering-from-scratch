# Evidence: cheatsheets/docker-sandboxes.md

Abbreviations: M = manuals/docker-sandboxes-101.

## Layers and doors (architecture, 5 nodes, 4 edges)
- host, sbx and docker-agent: M/sections/1-1-sbx-and-docker-agent.md:11, 13
- sandboxd, daemon and socket: M/capture/out/02-daemon-status.json:2-4
- Policy, rules and log: M/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md:7
- microVM, guest kernel: M/capture/out/04-env.txt:1
- Model Runner on localhost:12434: M/sections/1-2-docker-agent-run-sandbox-end-to-end.md:45
- sbx verbs edge: M/sections/1-1-sbx-and-docker-agent.md:11
- microVM edge: M/sections/3-1-sbx-diagnose-and-the-microvm-boundary.md:7
- check edge: M/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md:7
- proxy edge: M/sections/3-4-sbx-policy-log-and-the-proxy.md:7

## Create and check a sandbox (annotated-code, 6 lines)
- sbx create shell with name m101-demo: M/capture/out/04-create.txt:1
- sbx run --name m101-demo re-attach: M/capture/out/04-create.txt:16
- sbx exec runs as agent, uid 1000: M/sections/2-2-sbx-exec-cp-and-ports.md:7
- sbx exec -u root: M/capture/out/07-template-save.txt:1
- sbx ports --publish 18081:8080 binds tcp4: M/capture/out/05-ports.txt:1-2
- sbx ports lists bindings: M/capture/out/05-ports.txt:5-7

## Sandbox tasks (task-table, 8)
- sbx run --name: M/capture/out/04-create.txt:16
- sbx stop: M/sections/2-1-sbx-run-create-stop-and-rm.md:37
- sbx rm --force: M/capture/out/27-sbx-rm.txt:1
- sbx prune --dry-run --json: M/sections/2-1-sbx-run-create-stop-and-rm.md:62
- sbx prune --force: M/sections/2-1-sbx-run-create-stop-and-rm.md:66
- sbx cp SANDBOX:PATH: M/capture/out/06-cp.txt:1
- sbx template save --output: M/sections/2-3-sbx-template-save-and-load.md:20
- sbx create --pull never -t: M/capture/out/07-template-run.txt:1

## Policy and secret commands (command-table, 6)
- sbx policy init balanced: M/capture/out/03-policy-init.txt:1
- sbx policy allow network --sandbox: M/capture/out/README.md:1
- sbx policy deny network, conflict: M/capture/out/09-deny-conflict.txt:1
- sbx policy check network --verbose --json: M/capture/out/09-check-deny.json:1
- sbx policy log --json: M/capture/out/09-policy-log.json:1
- sbx secret set-custom --host --env --value: M/capture/out/10-set-custom.txt:1

## Defaults (defaults, 6)
- skills.defaultMode readonly: M/capture/out/02-settings-get.txt:1
- kit.allowedSources docker.io/: M/capture/out/02-settings.txt:1
- kit.requireSignature false: M/capture/out/02-settings.txt:1
- --pull default always: M/sections/2-1-sbx-run-create-stop-and-rm.md:52
- max_consecutive_tool_calls default 5: M/sections/5-2-agents-models-and-providers.md:24
- --refresh default 55 minutes: M/sections/3-5-sbx-secret-set-import-and-set-custom.md:20

## One sandboxed agent run (flow, 6 steps)
1. sandbox allow localhost:12434: M/capture/out/27-sandbox-allow.txt:1-4
2. data-dir inside workspace refused: M/capture/out/27-data-dir-outside.txt:2
3. launch summary workspace, image, cpu, memory: M/capture/out/27-sandbox-run.txt:1-12
4. proxy admits host.docker.internal: M/capture/out/27-inside-run.txt:1
5. SQLite cannot write session store: M/capture/out/27-sqlite-probe.txt:1
6. sbx rm --force docker-agent: M/capture/out/27-sbx-rm.txt:1

## Agent file commands (annotated-code, 5 lines)
- docker-agent doctor: M/capture/out/16-doctor.txt:1
- run --exec --last: M/capture/out/18-run-last.txt:1-2
- run --exec --json --safety restricted: M/capture/out/20-restricted.ndjson:1
- serve api --listen 127.0.0.1:8080 -s: M/capture/out/23-api.http:1
- serve chat --listen --api-key: M/capture/out/23-chat.http:1

## docker-agent commands (command-table, 4)
- docker-agent doctor: M/capture/out/16-doctor.txt:1
- run --sandbox --exec: M/capture/out/27-sandbox-run.txt:1
- sandbox allow localhost:12434: M/capture/out/27-sandbox-allow.txt:1
- sessions diff --fail-on-divergence -- -1 -3: M/capture/out/21-sessions-diff.txt:11

## Troubleshooting (troubleshooting, 4)
- cannot save a running sandbox: M/capture/out/07-template-save.txt:1-2
- Approval required with 403: M/capture/out/09-blocked.txt:6-8
- --data-dir inside workspace: M/capture/out/27-data-dir-outside.txt:2
- unknown shorthand flag in -1: M/capture/out/21-sessions-diff.txt:2

## Questions (qa, 3)
- --clone protects hooks: M/sections/3-2-clone-and-run-sandbox-source.md:9
- restricted mode denies unknown and destructive: M/sections/5-5-permissions-safety-and-hooks.md:33
- flags such as -p act at creation: M/sections/2-1-sbx-run-create-stop-and-rm.md:50

## Tips (tips, 5)
- sbx diagnose Virtualization line: M/sections/2-4-sandboxd-diagnose-and-reset.md:33
- --name keeps sandboxes apart: M/sections/2-1-sbx-run-create-stop-and-rm.md:23
- policy init balanced then ls --wide --json: M/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md:9
- keys via sbx secret set: M/sections/3-5-sbx-secret-set-import-and-set-custom.md:9
- pass -- before negative references: M/sections/5-6-session-db-sessions-diff-and-eval.md:33
