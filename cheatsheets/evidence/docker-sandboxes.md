# Evidence: cheatsheets/docker-sandboxes.md

Abbreviations: S = manuals/docker-sandboxes-101/sections, C = manuals/docker-sandboxes-101/capture, O = manuals/docker-sandboxes-101/capture/out.

## Layers and doors (architecture, 6 nodes)
- Your Mac, sbx and docker-agent: S/1-1-sbx-and-docker-agent.md:9
- sandboxd, socket and log: O/02-daemon-status.json:2-4
- Proxy, allow, deny, secrets: S/3-4-sbx-policy-log-and-the-proxy.md:5
- docker-agent loop and tools: S/1-1-sbx-and-docker-agent.md:20
- microVM, Linux 7.0.14: O/04-guest.txt:2
- Model Runner, ai/qwen3:4b on 12434: S/1-2-docker-agent-run-sandbox-end-to-end.md:21

## Sandbox tasks (task-table, 8 rows)
- sbx create shell with --name: O/04-create.txt:1
- sbx exec with sh -c: O/04-env.txt:1
- sbx ports --publish: O/05-ports.txt:1
- sbx cp SANDBOX:PATH: O/06-cp.txt:1
- sbx policy allow network --sandbox: O/09-allow.txt:1
- sbx secret set-custom --host --env --value: O/10-set-custom.txt:1
- sbx template save --output: O/07-template-save.txt:1
- docker-agent sandbox allow: O/27-sandbox-allow.txt:1

## Lifecycle in order (annotated-code, 5 lines)
- create line: O/04-create.txt:1
- exec line: O/04-env.txt:1
- publish line: O/05-ports.txt:1
- stop line: O/04-stop.txt:1
- rm line: O/27-sbx-rm.txt:1

## Who owns what (concepts, 4 bullets)
- sbx owns microVM, proxy, secret store: S/1-1-sbx-and-docker-agent.md:9
- sandboxd host daemon: O/02-daemon-status.json:2
- docker-agent loop: S/1-1-sbx-and-docker-agent.md:20
- Linux 7.0.14 and Docker Engine 29.8.1: O/04-guest.txt:2, 11

## run --sandbox, step by step (flow, 5 steps)
- Allow localhost:12434: O/27-sandbox-allow.txt:1-4
- Data directory inside workspace: O/27-data-dir-outside.txt:1
- Launch summary, cpu 10, memory 32 GiB: O/27-sandbox-run.txt:12-13
- SQLite error 1032: O/27-sandbox-run.txt:20
- Inside run and sbx rm: O/27-inside-run.txt:1, O/27-sbx-rm.txt:1

## docker-agent commands (command-table, 5 rows)
- doctor: S/5-1-docker-agent-run-new-and-doctor.md:30
- run --exec --json: S/5-1-docker-agent-run-new-and-doctor.md:14
- run --safety restricted: S/5-5-permissions-safety-and-hooks.md:20
- serve api on port 8080: S/6-1-serve-api-and-serve-chat.md:12
- serve chat on port 8083: S/6-1-serve-api-and-serve-chat.md:70

## Defaults (defaults, 6 rows)
- cpu 10: O/04-create.txt:7
- memory 32 GiB: O/04-create.txt:8
- template image: O/04-create.txt:6
- auto-stop 30 seconds: C/README.md:40
- balanced: O/03-policy-init.txt:1
- skills.defaultMode readonly: O/02-settings.json:2

## Workspace modes (comparison, 3 rows)
- Bind, same path rw: O/04-workspace.txt:1
- Clone, sandbox remote: O/08-clone-host.txt:1
- Commits back via fetch: O/08-clone-host.txt:8

## Troubleshooting (troubleshooting, 6 rows)
- 403 Blocked by network policy: S/1-2-docker-agent-run-sandbox-end-to-end.md:12
- --data-dir must be inside workspace: O/27-data-dir-outside.txt:1
- attempt to write a readonly database (1032): O/27-sandbox-run.txt:20
- cannot save a running sandbox: O/07-template-save.txt:1
- copying between sandboxes is not supported: O/06-cp.txt:17
- Approval required: O/09-blocked.txt:2

## Glossary (glossary, 4 terms)
- sandboxd: S/1-1-sbx-and-docker-agent.md:12
- proxy-managed: O/04-env.txt:12
- sbx-cs-<rand>: S/3-5-sbx-secret-set-import-and-set-custom.md:40
- DMR port 12434: S/1-2-docker-agent-run-sandbox-end-to-end.md:21

## Questions and answers (qa, 3 items)
- check network scope: S/3-3-sbx-policy-init-allow-deny-and-check-network.md:70
- custom secrets reach new sandboxes only: S/3-5-sbx-secret-set-import-and-set-custom.md:85
- sessions diff needs --: S/5-6-session-db-sessions-diff-and-eval.md:40

## Tips (tips, 4 bullets)
- Name every sandbox, so two agents stay apart: S/2-1-sbx-run-create-stop-and-rm.md:20
- Read sbx policy ls --wide --json before you trust a preset: S/3-3-sbx-policy-init-allow-deny-and-check-network.md:12
- Turn off ssh.agentForwardingEnabled for an agent you would not let sign with your key: S/3-5-sbx-secret-set-import-and-set-custom.md:90
- Run unattended agents with --safety restricted: S/5-5-permissions-safety-and-hooks.md:70
