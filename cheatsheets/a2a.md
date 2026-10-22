---
id: a2a
title: A2A Protocol
code: AP
subtitle: Run the A2A 101 capture kit, read its streams and cards, fix its errors, and check the records it writes.
hue: 210
sources: manuals/a2a-101
source_hash: 057e87dbb4aa49d8
---

## Kit layout
type: architecture
from: manuals/a2a-101/capture/README.md

```arch
node | planner | 1,1 | Planner | client agent | client
node | test | 2,1 | test-runner | port 41241 | process
node | review | 2,2 | code-reviewer | port 41242 | process
node | deploy | 2,3 | deployer | port 41243 | process
node | op | 3,3 | Operator | approves outside A2A | client
edge | planner | test |
edge | planner | review |
edge | planner | deploy |
edge | op | deploy |
```

## Run the kit
type: command-table
from: manuals/a2a-101/README.md, manuals/a2a-101/capture/README.md

| Command | What it does |
|---|---|
| `cd manuals/a2a-101` | Enters the manual folder. |
| `python3 capture/run.py --check` | Replays every exchange and compares each file. |
| `python3 capture/run.py` | Writes the files in `capture/out/` again. |
| `python3 run.py --check` | Same check, run from inside `capture/`. |
| `node manuals/_shared/figkit.js build manuals/a2a-101` | Builds the figures to `figures/*.svg`. |
| `node site/build-manuals.js` | Builds the site. |
| `node scripts/audit_manuals.js --manual a2a-101` | Must report `TOTAL 0`. |

## Open the captures
type: task-table
from: manuals/a2a-101/capture/README.md

| Task | Code |
|---|---|
| Open the message reply | `capture/out/02-message-reply.http` |
| Open the streaming capture | `capture/out/05-streaming.http` |

## Kit settings
type: defaults
from: manuals/a2a-101/capture/README.md

| Setting | Default | Note |
|---|---|---|
| test-runner port | 41241 | Agent on port 41241 |
| code-reviewer port | 41242 | Agent on port 41242 |
| deployer port | 41243 | Agent on port 41243 |
| Clock start | `2026-10-06T09:00:00Z` | Kit timestamps begin here |
| Clock step | 250 ms | Added at each new task or status |
| `A2A-Version` | `1.0` | The only value the kit accepts |
| Card signature | HS256 | Kit only, not a real card |

## One streamed task
type: flow
from: manuals/a2a-101/sections/1-2-one-task-request-by-request.md

1. **Client**: sends `SendStreamingMessage` with a minted `messageId` and no ids.
2. **Server**: frame 1 is the `task` in `TASK_STATE_SUBMITTED`.
3. **Server**: frame 2 moves it to `TASK_STATE_WORKING`.
4. **Server**: frames 3 to 8 send `artifactUpdate` chunks, and `lastChunk` ends one artifact.
5. **Server**: frame 9 sets `TASK_STATE_COMPLETED`, then closes the stream.

## Approval wait
type: annotated-code
lang: python
from: manuals/a2a-101/capture/agents.py

```python
approved = threading.Event()                       # one event per task
turn.agent.approvals[turn.task["id"]] = approved   # POST /approve sets it
yield approved                                     # the stream waits here
```

## Symptoms and fixes
type: troubleshooting
from: manuals/a2a-101/capture/README.md

| Symptom | Cause | Fix |
|---|---|---|
| HTTP 401 with `WWW-Authenticate` | Missing or wrong bearer token | Send the bearer token on every request. |
| `-32009` on a message | `A2A-Version` missing or not `1.0` | Send `A2A-Version: 1.0`. |
| `-32602` on a message | Client sends a role other than `ROLE_USER` | Send `ROLE_USER` from the client. |
| No first `Task` at the webhook | Webhooks get status and artifact updates only | Call `GetTask` to read the first snapshot. |

## Questions
type: qa
from: manuals/a2a-101/capture/README.md

- **Why are two runs identical?** Seeded ids and a fixed clock, with nothing masked.
- **Does the kit send `Cache-Control`?** No. It sends neither `Cache-Control` nor `ETag`.
- **Which version does the kit accept?** Exactly `1.0`, from the header or the query parameter.

## Tips
type: tips
from: manuals/a2a-101/capture/README.md

- Run `--check` after each change, because it compares every file plainly.
- Send `ROLE_USER` from the client, because any other role gets `-32602`.
- Read the `*.events.json` files for stream frames, pretty-printed.
- After a webhook arrives, call `GetTask` for the first snapshot.

## Terms
type: glossary
from: manuals/a2a-101/capture/README.md

- **Capture kit**: the folder that records every exchange of the manual.
- **Scenario file**: an `.http` file that shows one case, such as `02-message-reply.http`.
- **Stream frame**: one `data:` event of a stream, saved in `*.events.json`.
- **Reference SDK**: `a2a-sdk` 1.2.2, the implementation the kit was compared with.
