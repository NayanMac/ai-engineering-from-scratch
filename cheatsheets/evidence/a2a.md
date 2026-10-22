# Evidence: cheatsheets/a2a.md

Abbreviations: MA = manuals/a2a-101, MC = manuals/a2a-101/capture, MS = manuals/a2a-101/sections.

## Architecture: Kit layout (architecture, 5 nodes)
- planner, client agent: MC/README.md:20
- test-runner, port 41241: MC/README.md:16
- code-reviewer, port 41242: MC/README.md:17
- deployer, port 41243: MC/README.md:18
- Operator, approves outside A2A: MC/README.md:71

## Run the kit (command-table, 7 rows)
- `cd manuals/a2a-101`: MA/README.md:27
- `python3 capture/run.py --check`: MA/README.md:28, 31
- `python3 capture/run.py`: MA/README.md:31
- `python3 run.py --check`: MC/README.md:7
- `node manuals/_shared/figkit.js build manuals/a2a-101`: MA/README.md:36, 19
- `node site/build-manuals.js`: MA/README.md:37
- `node scripts/audit_manuals.js --manual a2a-101`: MA/README.md:38, 41

## Open the captures (task-table, 2 rows)
- Message reply capture: MC/README.md:27
- Streaming capture: MC/README.md:30

## Kit settings (defaults, 7 rows)
- test-runner port 41241: MC/README.md:16
- code-reviewer port 41242: MC/README.md:17
- deployer port 41243: MC/README.md:18
- Clock start 2026-10-06T09:00:00Z: MC/README.md:10
- Clock step 250 ms: MC/README.md:10
- A2A-Version 1.0: MC/README.md:65
- Card signature HS256: MC/README.md:67

## One streamed task (flow, 5 steps)
1. Client sends SendStreamingMessage: MS/1-2-one-task-request-by-request.md:33
2. Frame 1 holds the task in TASK_STATE_SUBMITTED: MS/1-2-one-task-request-by-request.md:58-62
3. Frame 2 moves it to TASK_STATE_WORKING: MS/1-2-one-task-request-by-request.md:78
4. Frames 3 to 8 send artifactUpdate chunks with lastChunk: MS/1-2-one-task-request-by-request.md:84-89
5. Frame 9 sets TASK_STATE_COMPLETED and the stream closes: MS/1-2-one-task-request-by-request.md:93, 95

## Approval wait (annotated-code, 3 lines)
- approved = threading.Event(): MC/agents.py:172
- turn.agent.approvals[turn.task["id"]] = approved: MC/agents.py:173
- yield approved: MC/agents.py:175

## Symptoms and fixes (troubleshooting, 4 rows)
- HTTP 401 with WWW-Authenticate, missing or wrong token: MC/README.md:66
- -32009 on A2A-Version: MC/README.md:65
- -32602 on a role other than ROLE_USER: MC/README.md:70
- No first Task at the webhook: MC/README.md:64

## Questions (qa, 3 items)
- Identical runs, seeded ids and fixed clock: MC/README.md:10
- No Cache-Control or ETag: MC/README.md:69
- Exactly 1.0 accepted: MC/README.md:65

## Tips (tips, 4 items)
- Run --check, plain comparison: MC/README.md:10
- Send ROLE_USER from the client, other roles get -32602: MC/README.md:70
- Read *.events.json for stream frames: MC/README.md:46
- Call GetTask for the first snapshot: MC/README.md:64

## Terms (glossary, 4 rows)
- Capture kit: MC/README.md:3
- Scenario file: MC/README.md:22, 26
- Stream frame in *.events.json: MC/README.md:46
- Reference SDK a2a-sdk 1.2.2: MC/README.md:50
