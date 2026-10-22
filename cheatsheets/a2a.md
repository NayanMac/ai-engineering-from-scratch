---
id: a2a
title: A2A Protocol
code: AP
subtitle: Run the A2A 101 kit, read streams and task states, and handle the errors the kit shows. Protocol 1.0.
hue: 210
sources: manuals/a2a-101
source_hash: ad21d385000c4e28
---

## Kit architecture
type: architecture
from: manuals/a2a-101/front.md, manuals/a2a-101/capture/README.md

```arch
node | planner | 1,1 | Planner | client agent | client
node | test | 2,1 | test-runner | port 41241 | process
node | review | 3,1 | code-reviewer | port 41242 | process
node | deploy | 4,1 | deployer | port 41243 | process
node | hook | 2,2 | Webhook receiver | port 41250 | client
edge | planner | test | SendStreamingMessage
edge | planner | review | SendMessage
edge | planner | deploy | SendMessage
edge | test | hook | push
```

## Run the kit
type: command-table
from: manuals/a2a-101/front.md, manuals/a2a-101/README.md

| Command | What it does |
|---|---|
| `cd manuals/a2a-101` | Enter the manual folder. |
| `python3 capture/run.py` | Record the files in `capture/out/`. |
| `python3 capture/run.py --check` | Capture again and compare. |
| `node scripts/audit_manuals.js --manual a2a-101` | Audit the manual. Must report `TOTAL 0`. |

## Annotated run
type: annotated-code
lang: bash
from: manuals/a2a-101/capture/README.md, manuals/a2a-101/README.md

```bash
python3 run.py          # writes out/
python3 run.py --check  # captures again into a temporary folder and compares
python3 capture/run.py --check
```

## Kit tasks
type: task-table
from: manuals/a2a-101/capture/README.md, manuals/a2a-101/capture/agents.py

| Task | Where |
|---|---|
| Read the card of `test-runner` | `GET /.well-known/agent-card.json` on port 41241 |
| Send a streamed task | `SendStreamingMessage` on `/a2a/jsonrpc` |
| Ask a question to `code-reviewer` | `SendMessage` on port 41242 |
| Approve a deploy outside A2A | `POST /approve/<task id>` on port 41243 |

## Defaults
type: defaults
from: manuals/a2a-101/front.md, manuals/a2a-101/capture/README.md

| Setting | Default | Note |
|---|---|---|
| Protocol version | `1.0` | Every request and card |
| Webhook port | 41250 | Receiver on 127.0.0.1 |
| Clock start | 2026-10-06T09:00:00Z | Kit timestamps |
| Clock step | 250 ms | Each new task or status |

## Troubleshooting
type: troubleshooting
from: manuals/a2a-101/capture/README.md

| Symptom | Cause | Fix |
|---|---|---|
| Message role is not the client role | Server rejects it | Send the client role on every client message |
| Card has no `Cache-Control` or `ETag` | Kit omits cache headers | Cache the card for the session |
| Stream closes at input required | Kit closes there | Read the task after the close |
| Webhook gets no first Task snapshot | Kit sends updates only | Read the task with `GetTask` |
| `append` to unknown `artifactId` starts a new artifact | Kit starts a new artifact | Send the first chunk without `append` |

## Stream flow
type: flow
from: manuals/a2a-101/capture/out/05-streaming.events.json

1. **Submitted**: the first frame holds the task in `TASK_STATE_SUBMITTED`.
2. **Working**: frame 2 sets `TASK_STATE_WORKING`.
3. **Artifact**: frames 3 to 7 append the `test-log` chunks, with `lastChunk` on frame 7.
4. **Summary**: frame 8 sends the `summary` artifact with `lastChunk`.
5. **Completed**: frame 9 sets `TASK_STATE_COMPLETED`, then the stream closes.

## Deploy approval
type: flow
from: manuals/a2a-101/capture/out/07-auth-required.events.json

1. **Working**: frame 2 sets `TASK_STATE_WORKING` for the deploy.
2. **Auth required**: frame 3 sets `TASK_STATE_AUTH_REQUIRED` and asks for approval.
3. **Approved**: frame 4 sets `TASK_STATE_WORKING` again.
4. **Report**: frame 5 sends the `deploy-report` artifact.
5. **Completed**: frame 6 sets `TASK_STATE_COMPLETED`.

## Glossary
type: glossary
from: manuals/a2a-101/front.md, manuals/a2a-101/capture/README.md, manuals/a2a-101/capture/out/05-streaming.events.json, manuals/a2a-101/capture/out/07-auth-required.events.json

- **Capture kit**: The three agents and the planner in `capture/`, with no dependencies.
- **Terminal state**: A final state that ends the task. The stream closes after it.
- **Interrupted state**: A state where the task waits for input or approval. `TASK_STATE_AUTH_REQUIRED` is one.
- **Stream**: Server-sent frames for one task.

## Questions
type: qa
from: manuals/a2a-101/capture/README.md, manuals/a2a-101/front.md

- **Are the kit records real traffic?** No. They match `a2a-sdk` 1.2.2 in structure, with the differences the kit README lists.
- **Why do two runs match byte for byte?** Ids come from seeded generators and the clock is fixed.
- **Where is the planner?** It is `planner.py`, the client agent of section 7.1.

## Tips
type: tips
from: manuals/a2a-101/capture/README.md, manuals/a2a-101/front.md

- Start with `capture/out/02-message-reply.http`, then open `capture/out/05-streaming.http`.
- Read the kit README first to see where the kit differs from the reference SDK.
- Check the version header on every request: `1.0`.
