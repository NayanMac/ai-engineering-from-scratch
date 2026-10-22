---
id: a2a
title: A2A Protocol
code: AP
subtitle: Cards, tasks, messages, streams, errors and bindings of A2A 1.0.1, each one shown by the capture kit.
hue: 262
sources: manuals/a2a-101
source_hash: 9dedc51c31b1f1fd
---

## Three agents and a planner
type: architecture
from: manuals/a2a-101/capture/README.md, manuals/a2a-101/capture/agents.py, manuals/a2a-101/sections/7-1-a-client.md, manuals/a2a-101/sections/7-2-a-server.md

```arch
node | planner | 1,1 | Planner | client agent, section 7.1 | client
node | runner | 2,1 | test-runner | port 41241, streams logs | process
node | review | 2,2 | code-reviewer | port 41242, asks questions | process
node | deploy | 2,3 | deployer | port 41243, bearer token | process
node | store | 3,1 | Task store | one per agent | store
node | hook | 3,3 | Webhook receiver | port 41250 | queue
edge | planner | runner | SendStreamingMessage
edge | planner | review | SendMessage
edge | planner | deploy | Bearer token
edge | runner | store | tasks
edge | runner | hook | push
```

## Run and check the kit
type: command-table
from: manuals/a2a-101/README.md

| Command | What it does |
|---|---|
| `cd manuals/a2a-101` | Enter the manual folder before any kit command. |
| `python3 capture/run.py` | Records the files again into `capture/out/`. |
| `python3 capture/run.py --check` | Starts agents on 41241 to 41243 and compares each file. |
| `node manuals/_shared/figkit.js build manuals/a2a-101` | Builds the figures to SVG. |
| `node site/build-manuals.js` | Builds the manual site. |
| `node scripts/audit_manuals.js --manual a2a-101` | Must report `TOTAL 0`. |

## One SendMessage over JSON-RPC
type: annotated-code
lang: http
from: manuals/a2a-101/sections/5-1-json-rpc.md, manuals/a2a-101/sections/3-1-message.md

```http
POST /a2a/jsonrpc HTTP/1.1  # one URL for every method
Host: localhost:41241
Content-Type: application/json
A2A-Version: 1.0  # missing means 0.3, refused with -32009

{"jsonrpc": "2.0", "id": 1, "method": "SendMessage",  # PascalCase name
 "params": {"message": {"messageId": "<uuid>", "role": "ROLE_USER",  # client mints it
 "parts": [{"text": "<text>"}]}}}  # one text part
```

## One streamed task, frame by frame
type: flow
from: manuals/a2a-101/sections/1-2-one-task-request-by-request.md, manuals/a2a-101/capture/out/05-streaming.events.json

1. **Client**: `SendStreamingMessage` with no `taskId` and no `contextId`.
2. **Frame 1**: a `task` in `TASK_STATE_SUBMITTED`, with both ids minted by the server.
3. **Frame 2**: a `statusUpdate` to `TASK_STATE_WORKING`.
4. **Frames 3 to 8**: `artifactUpdate` chunks. Later chunks set `append`, and `lastChunk` ends one artifact.
5. **Frame 9**: a `statusUpdate` to `TASK_STATE_COMPLETED`.
6. **Server**: closes the stream. The task stays in the store.
7. **Client**: calls `GetTask` to confirm the state.

## Objects that carry the work
type: concepts
from: manuals/a2a-101/sections/3-1-message.md, manuals/a2a-101/sections/3-2-part.md, manuals/a2a-101/sections/3-3-artifact-and-chunks.md, manuals/a2a-101/sections/3-4-task-and-task-state.md, manuals/a2a-101/sections/3-5-context-id.md

- **Message**: one turn. The sender mints `messageId`, and `role` is `ROLE_USER` or `ROLE_AGENT`.
- **Part**: exactly one of `text`, `raw`, `url` or `data`, with `mediaType` on each.
- **Artifact**: a result. `artifactId` is unique in the task, and chunks join on it.
- **Task**: an `id` the server mints, one `status`, and a `history`.
- **contextId**: groups many tasks into one conversation.
- **Stream**: `text/event-stream` with `data:` lines. Each line holds one `StreamResponse`.

## Calls by operation
type: task-table
from: manuals/a2a-101/sections/r-1-operations-by-binding.md, manuals/a2a-101/sections/5-2-http-json.md

| Task | Code |
|---|---|
| Send a message | `SendMessage` at `POST /message:send` |
| Stream a send | `SendStreamingMessage` at `POST /message:stream` |
| Read a task | `GetTask` at `GET /tasks/{id=*}` |
| List tasks | `ListTasks` at `GET /tasks` |
| Cancel a task | `CancelTask` at `POST /tasks/{id=*}:cancel` |
| Watch a task | `SubscribeToTask` at `POST /tasks/{id}:subscribe` |
| Register a webhook | `CreateTaskPushNotificationConfig` at `POST /tasks/{task_id=*}/pushNotificationConfigs` |
| Read the extended card | `GetExtendedAgentCard` at `GET /extendedAgentCard` |

## Defaults and kit settings
type: defaults
from: manuals/a2a-101/sections/5-4-version-and-extension-headers.md, manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/4-3-get-task-and-list-tasks.md, manuals/a2a-101/sections/7-1-a-client.md, manuals/a2a-101/sections/2-3-extended-cards-and-signatures.md, manuals/a2a-101/front.md, manuals/a2a-101/capture/README.md

| Setting | Default | Note |
|---|---|---|
| `A2A-Version` | `1.0` | Sent on every request. An empty value means 0.3, which 1.0 refuses. |
| `returnImmediately` | `false` | A send waits for a terminal or interrupted state. |
| `historyLength` | unset | No limit. `0` omits the history. |
| `pageSize` in `ListTasks` | `50` | Maximum 100. |
| Client timeout in the kit | `15 s` | Per request, as section 7.1 states. |
| Kit clock | `2026-10-06T09:00:00Z` | Moves 250 ms for each new stamp. |
| Kit ports | `41241` to `41243` | Agents. The webhook receiver is `41250`. |
| Kit signing algorithm | `HS256` | Real cards use `ES256` or `RS256`. |

## Errors and fixes
type: troubleshooting
from: manuals/a2a-101/sections/5-4-version-and-extension-headers.md, manuals/a2a-101/sections/5-5-errors.md, manuals/a2a-101/sections/7-4-from-0-3-to-1-0.md, manuals/a2a-101/sections/2-2-discovery-and-supported-interfaces.md, manuals/a2a-101/sections/4-4-cancel-task-and-terminal-states.md, manuals/a2a-101/sections/3-2-part.md, manuals/a2a-101/sections/3-3-artifact-and-chunks.md, manuals/a2a-101/sections/6-1-security-schemes-and-in-task-authorization.md

| Symptom | Cause | Fix |
|---|---|---|
| `-32009`, requested `0.3 (no header)` | No `A2A-Version` header | Send `A2A-Version: 1.0` on every request. |
| `-32601` on `message/send` | A 0.3 method name | Use `SendMessage`. |
| HTTP 401 with `WWW-Authenticate` | No bearer token | Send `Authorization: Bearer <token>`. |
| `-32003` on a push call | The card has no `pushNotifications` flag | Read the card before the call. |
| `-32004` on a finished task | The task is terminal | Start a new task with `referenceTaskIds`. |
| `-32005` for an `image/png` part | The media type is not in the card | Send a listed media type. |
| Stream ends with no final state | The connection dropped | Call `SubscribeToTask`, or `GetTask` to confirm. |
| Chunk with `append` lost | Unknown `artifactId`, and servers disagree | Send the first chunk without `append`. |

## Sign and verify a card
type: flow
from: manuals/a2a-101/sections/2-3-extended-cards-and-signatures.md, manuals/a2a-101/capture/README.md

1. **Canonical payload**: the card without `signatures`, keys sorted, no spaces, as RFC 8785 sets.
2. **Protected header**: `alg`, `typ` and `kid`, such as `deployer-key-1`.
3. **Signing input**: the base64url header, a period, then the base64url payload.
4. **Signature entry**: `protected` and `signature` go into `signatures`.
5. **Verify**: rebuild the payload from the received card and check the signature.
6. **Edit one field**: the check fails, because the canonical bytes changed.

## Questions
type: qa
from: manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/4-4-cancel-task-and-terminal-states.md, manuals/a2a-101/sections/3-5-context-id.md, manuals/a2a-101/sections/3-3-artifact-and-chunks.md, manuals/a2a-101/sections/6-1-security-schemes-and-in-task-authorization.md

- **Why does a send block by default?** `returnImmediately` defaults to `false`, so the call waits.
- **Who mints a task id?** The server. A client `taskId` on a new task is refused.
- **Does a finished task take messages?** No. It answers `UnsupportedOperationError`.
- **Does `lastChunk` end the task?** No. It ends one artifact, and the task runs on.
- **Where does approval travel?** Outside A2A. In the kit it is `POST /approve/<task id>`.

## Tips
type: tips
from: manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/4-4-cancel-task-and-terminal-states.md, manuals/a2a-101/sections/5-1-json-rpc.md, manuals/a2a-101/sections/5-2-http-json.md, manuals/a2a-101/sections/6-3-security-requirements.md, manuals/a2a-101/sections/r-2-objects-and-fields.md

- Switch on the state of every reply, and treat an unknown state as an error.
- Treat every terminal state as the end of the loop.
- Send `application/a2a+json`, and accept `application/json` when you read.
- Copy shapes from the proto, never from a sample. Samples break REQUIRED fields.
- Keep the bearer token and the webhook secret out of logs.
