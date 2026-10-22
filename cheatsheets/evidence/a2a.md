# Evidence: cheatsheets/a2a.md

Abbreviations: R = manuals/a2a-101/README.md, F = manuals/a2a-101/front.md, C = manuals/a2a-101/capture/README.md, A = manuals/a2a-101/capture/agents.py, S = manuals/a2a-101/capture/out/05-streaming.events.json, U = manuals/a2a-101/capture/out/07-auth-required.events.json.

## Architecture: Kit architecture (5 nodes, 4 edges)
- planner, client agent: C:20
- test-runner port 41241: C:16, A:21
- code-reviewer port 41242: C:17
- deployer port 41243: C:18
- Webhook receiver port 41250: F:55
- edge planner to test SendStreamingMessage: F:55, C:16
- edge planner to review SendMessage: C:17
- edge planner to deploy SendMessage: C:18
- edge test to hook push: F:55

## Run the kit (command-table, 4)
- cd manuals/a2a-101: F:58
- python3 capture/run.py: F:59
- python3 capture/run.py --check: F:60, R:28
- node scripts/audit_manuals.js --manual a2a-101: R:38, R:41

## Annotated run (annotated-code, 3)
- python3 run.py writes out/: C:6
- python3 run.py --check captures and compares: C:7
- python3 capture/run.py --check: R:28

## Kit tasks (task-table, 4)
- GET /.well-known/agent-card.json on 41241: A:21
- SendStreamingMessage on /a2a/jsonrpc: C:14, A:13
- SendMessage on port 41242: C:17
- POST /approve/<task id> on port 41243: C:71

## Defaults (defaults, 4)
- Protocol version 1.0: F:19
- Webhook port 41250: F:55
- Clock start 2026-10-06T09:00:00Z: C:10
- Clock step 250 ms: C:10

## Troubleshooting (troubleshooting, 5)
- Message role is not the client role, rejected: C:70
- No Cache-Control or ETag: C:69
- Stream closes at input required: C:54
- Webhook gets no first Task snapshot: C:64
- append to unknown artifactId starts new artifact: C:62

## Stream flow (flow, 5)
- Submitted, first frame: S:14
- Working, frame 2: S:41
- Artifact chunks, frames 3 to 7: S:58-76, S:77-95, S:96-114, S:115-133, S:134-153
- Summary artifact, frame 8: S:154-183
- Completed, frame 9: S:192

## Deploy approval (flow, 5)
- Working, frame 2: U:41
- Auth required, frame 3: U:66
- Approved, frame 4: U:91
- deploy-report artifact, frame 5: U:116-133
- Completed, frame 6: U:142

## Glossary (glossary, 4)
- Capture kit: C:3, C:12
- Terminal state, a final state that ends the task: C:48, S:192
- Interrupted state, waits for input or approval, TASK_STATE_AUTH_REQUIRED: F:21, U:66
- Stream, frames for one task: S:5

## Questions (qa, 3)
- Real traffic, structure matches a2a-sdk 1.2.2: C:50
- Byte-identical runs, seeded ids: C:10
- Planner is planner.py: C:20

## Tips (tips, 3)
- Start with 02-message-reply.http: F:61
- Read the kit README first: C:50
- Version header 1.0: F:19
