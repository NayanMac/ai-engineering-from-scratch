---
id: a2a
title: A2A Protocol
code: AP
subtitle: Cards, tasks, bindings, states and errors for A2A 1.0.1, with the capture kit commands.
hue: 230
sources: manuals/a2a-101
source_hash: 057e87dbb4aa49d8
---

## Protocol stack
type: architecture
from: manuals/a2a-101/sections/7-2-a-server.md, manuals/a2a-101/sections/2-2-discovery-and-supported-interfaces.md, manuals/a2a-101/sections/7-1-a-client.md, manuals/a2a-101/sections/4-6-push-notification-configs.md

```arch
node | client | 1,1 | Planner | client agent | client
node | card | 2,1 | Agent card | /.well-known/agent-card.json | store
node | iface | 3,1 | Interface | JSONRPC or HTTP+JSON | process
node | exec | 2,2 | Executor | checks, then agent logic | process
node | store | 3,2 | Task store | one record per task | store
node | events | 2,3 | Event queue | streams and webhooks | queue
edge | client | card | GET
edge | card | iface | read
edge | client | exec | POST
edge | exec | store | save
edge | exec | events | updates
edge | events | client | frames
```

## One task, send to close
type: flow
from: manuals/a2a-101/sections/1-2-one-task-request-by-request.md, manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/4-2-input-required-and-auth-required.md, manuals/a2a-101/sections/4-5-streaming-and-subscribe-to-task.md

1. **Client**: sends `SendMessage` with a fresh `messageId` and no task id.
2. **Server**: creates the task in `TASK_STATE_SUBMITTED` and returns it.
3. **Agent**: sets `TASK_STATE_WORKING` and streams artifact chunks.
4. **Agent**: stops at `TASK_STATE_INPUT_REQUIRED`. The client answers with the same `taskId` and `contextId`.
5. **Operator**: approves `TASK_STATE_AUTH_REQUIRED` outside A2A.
6. **Server**: reaches a terminal state and closes the stream. The client calls `GetTask`.

## Call the protocol
type: task-table
from: manuals/a2a-101/sections/2-2-discovery-and-supported-interfaces.md, manuals/a2a-101/sections/5-1-json-rpc.md, manuals/a2a-101/sections/1-2-one-task-request-by-request.md, manuals/a2a-101/sections/5-2-http-json.md, manuals/a2a-101/sections/5-4-version-and-extension-headers.md, manuals/a2a-101/sections/4-2-input-required-and-auth-required.md

| Task | Code |
|---|---|
| Read a card | `GET /.well-known/agent-card.json` |
| Send and wait | `SendMessage` |
| Stream a task | `SendStreamingMessage` |
| Reattach to a task | `POST /tasks/{id}:subscribe` |
| Declare the version | `A2A-Version: 1.0` |
| Approve outside A2A | `POST /approve/<task id>` |

## Run and check the kit
type: command-table
from: manuals/a2a-101/README.md, manuals/a2a-101/sections/7-3-conformance-testing.md

| Command | What it does |
|---|---|
| `cd manuals/a2a-101` | Enters the manual folder. |
| `python3 capture/run.py --check` | Replays every recorded exchange and compares the files. |
| `python3 capture/run.py` | Records the capture files again. |
| `node manuals/_shared/figkit.js build manuals/a2a-101` | Builds the figures. |
| `node scripts/audit_manuals.js --manual a2a-101` | Must report `TOTAL 0`. |
| `./run_tck.py --sut-host http://localhost:9999` | Runs the conformance suite against a server. |

## Dispatch on a SendMessage reply
type: annotated-code
lang: python
from: manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/7-1-a-client.md

```python
while True:
    if "error" in reply:                 # errors arrive inside HTTP 200
        return None
    result = reply["result"]
    if "message" in result:              # a direct reply has no task
        return result["message"]
    task = result["task"] if "task" in result else result
    state = task["status"]["state"]
    if state in TERMINAL:                # four terminal states, REJECTED too
        return task
```

## Defaults
type: defaults
from: manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/4-3-get-task-and-list-tasks.md, manuals/a2a-101/sections/2-1-agentcard-fields.md, manuals/a2a-101/sections/7-1-a-client.md, manuals/a2a-101/sections/5-4-version-and-extension-headers.md

| Setting | Default | Note |
|---|---|---|
| `returnImmediately` | `false` | A send waits for a terminal or interrupted state. |
| `pageSize` | 50 | `ListTasks` allows at most 100. |
| `includeArtifacts` | `false` | `ListTasks` omits artifacts unless set. |
| `streaming` capability | `false` | An absent flag counts as `false`. |
| Client request timeout | 15 seconds | Kit client, from `wire.py`. |
| `A2A-Version` | `1.0` | Send it on every request. |

## Terms that decide the next call
type: concepts
from: manuals/a2a-101/sections/4-4-cancel-task-and-terminal-states.md, manuals/a2a-101/sections/4-2-input-required-and-auth-required.md, manuals/a2a-101/sections/3-3-artifact-and-chunks.md, manuals/a2a-101/sections/3-5-context-id.md

- **Terminal state**: `TASK_STATE_COMPLETED`, `TASK_STATE_FAILED`, `TASK_STATE_CANCELED`, or `TASK_STATE_REJECTED`. The task never changes again.
- **Interrupted state**: `TASK_STATE_INPUT_REQUIRED` or `TASK_STATE_AUTH_REQUIRED`. The task waits for you.
- **Chunk**: one piece of an artifact. Join chunks by `artifactId` until `lastChunk` is true.
- **contextId**: groups tasks into one conversation. The server creates the task id.

## Troubleshooting
type: troubleshooting
from: manuals/a2a-101/sections/5-4-version-and-extension-headers.md, manuals/a2a-101/sections/7-4-from-0-3-to-1-0.md, manuals/a2a-101/sections/6-1-security-schemes-and-in-task-authorization.md, manuals/a2a-101/sections/4-4-cancel-task-and-terminal-states.md, manuals/a2a-101/sections/5-5-errors.md

| Symptom | Cause | Fix |
|---|---|---|
| `-32009` with `0.3 (no header)` | No `A2A-Version` header | Send `A2A-Version: 1.0` |
| `-32601` on `message/send` | A 0.3 method name | Use `SendMessage` |
| HTTP 401 before any method | Missing or wrong bearer token | Send the token in `Authorization: Bearer` |
| `-32002` on `CancelTask` | The task is already terminal | Call `GetTask`, then start a new task |
| `-32602` with `messageId is required` | The message has no `messageId` | Mint a `messageId` for each message |

## Glossary
type: glossary
from: manuals/a2a-101/sections/r-5-glossary.md

- **Agent card**: The JSON document that describes an agent, usually at `/.well-known/agent-card.json`.
- **Stream**: Server-Sent Events, or a gRPC stream, of `StreamResponse` frames.
- **Extension**: A protocol addition named by a URI, activated with `A2A-Extensions`.

## Questions
type: qa
from: manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/4-5-streaming-and-subscribe-to-task.md, manuals/a2a-101/sections/4-2-input-required-and-auth-required.md

- **Does a blocking send wait?** Yes, by default. Section 3.1.1 says otherwise, and the proto and the SDKs wait.
- **Why did my stream close?** A terminal state closes it. At an interrupted state the spec disagrees, so call `GetTask` after any close.
- **Who approves a deploy?** A person, outside A2A. The protocol carries no approval.

## Tips
type: tips
from: manuals/a2a-101/sections/2-2-discovery-and-supported-interfaces.md, manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/4-5-streaming-and-subscribe-to-task.md

- Read `capabilities` before any optional call.
- Switch on each state and each `ErrorInfo` reason, never on message text.
- Rebuild a dropped stream from the `Task` snapshot that `SubscribeToTask` returns.
