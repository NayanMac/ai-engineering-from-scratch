# Evidence: cheatsheets/a2a.md

Abbreviations: S = manuals/a2a-101/sections, C = manuals/a2a-101/capture, M = manuals/a2a-101.

## Three agents and a planner (architecture, 6 nodes)
- planner is the client agent of section 7.1: S/7-1-a-client.md:5
- test-runner on port 41241, streams the log: C/README.md:9
- code-reviewer on port 41242, asks a question: C/README.md:10
- deployer on port 41243, bearer token: C/README.md:11
- Task store, one per agent: S/7-2-a-server.md:9, 14
- Webhook receiver on port 41250: M/front.md:14

## Run and check the kit (command-table, 6)
- `cd manuals/a2a-101` before any kit command: M/README.md:24
- `python3 capture/run.py` records into capture/out: M/README.md:21
- `python3 capture/run.py --check` compares each file: M/README.md:22
- `node manuals/_shared/figkit.js build manuals/a2a-101`: M/README.md:31
- `node site/build-manuals.js`: M/README.md:32
- `node scripts/audit_manuals.js --manual a2a-101` must report `TOTAL 0`: M/README.md:33, 36

## One SendMessage over JSON-RPC (annotated-code, 4 lines)
- POST /a2a/jsonrpc HTTP/1.1 and the one URL for every method: S/5-1-json-rpc.md:58, 62
- A2A-Version 1.0 header, missing means 0.3: S/5-4-version-and-extension-headers.md:27
- messageId minted by the client, role ROLE_USER: S/3-1-message.md:12, 18
- method SendMessage in PascalCase: S/5-1-json-rpc.md:24

## One streamed task, frame by frame (flow, 7 steps)
- SendStreamingMessage with no ids: S/1-2-one-task-request-by-request.md:22, 34
- Frame 1 is a task in TASK_STATE_SUBMITTED: S/1-2-one-task-request-by-request.md:44, C/out/05-streaming.events.json:12
- Frame 2 is a statusUpdate to TASK_STATE_WORKING: S/1-2-one-task-request-by-request.md:60
- Frames 3 to 8 are artifactUpdate chunks with append: S/1-2-one-task-request-by-request.md:66-72, C/out/05-streaming.events.json:40-70
- Frame 9 moves to TASK_STATE_COMPLETED: S/1-2-one-task-request-by-request.md:80
- Server closes the stream after the terminal state: S/1-2-one-task-request-by-request.md:84
- GetTask confirms the state after the stream: S/1-2-one-task-request-by-request.md:96

## Objects that carry the work (concepts, 6)
- Message: messageId from the sender, role: S/3-1-message.md:12, 18
- Part: exactly one content member, mediaType: S/3-2-part.md:14, 22
- Artifact: artifactId unique in the task: S/3-3-artifact-and-chunks.md:12
- Task: server-minted id, status, history: S/3-4-task-and-task-state.md:14, 20
- contextId groups tasks: S/3-5-context-id.md:8
- Stream of data lines, each a StreamResponse: S/5-1-json-rpc.md:70

## Calls by operation (task-table, 8)
- SendMessage at POST /message:send: S/r-1-operations-by-binding.md:12
- SendStreamingMessage at POST /message:stream: S/r-1-operations-by-binding.md:13
- GetTask at GET /tasks/{id=*}: S/r-1-operations-by-binding.md:14
- ListTasks at GET /tasks: S/r-1-operations-by-binding.md:15
- CancelTask at POST /tasks/{id=*}:cancel: S/r-1-operations-by-binding.md:16
- SubscribeToTask at POST /tasks/{id}:subscribe: S/r-1-operations-by-binding.md:17, S/5-2-http-json.md:14
- CreateTaskPushNotificationConfig route: S/r-1-operations-by-binding.md:18
- GetExtendedAgentCard at GET /extendedAgentCard: S/r-1-operations-by-binding.md:21

## Defaults and kit settings (defaults, 8)
- A2A-Version 1.0 on every request: S/5-4-version-and-extension-headers.md:18
- returnImmediately false, the send waits: S/4-1-send-message.md:18, 22
- historyLength unset means no limit, 0 omits: S/4-3-get-task-and-list-tasks.md:14, 17
- pageSize default 50, maximum 100: S/4-3-get-task-and-list-tasks.md:52
- client timeout 15 seconds: S/7-1-a-client.md:66
- kit clock 2026-10-06T09:00:00Z, 250 ms steps: C/README.md:5
- kit ports 41241 to 41243: M/front.md:12
- kit signing HS256, real cards ES256 or RS256: S/2-3-extended-cards-and-signatures.md:118

## Errors and fixes (troubleshooting, 8)
- -32009 with requested 0.3 (no header): S/5-4-version-and-extension-headers.md:45
- -32601 for message/send: S/7-4-from-0-3-to-1-0.md:14
- HTTP 401 with WWW-Authenticate: S/6-1-security-schemes-and-in-task-authorization.md:58
- -32003 when the card has no push flag: S/2-2-discovery-and-supported-interfaces.md:52
- -32004 on a finished task, use referenceTaskIds: S/4-4-cancel-task-and-terminal-states.md:70
- -32005 for image/png: S/3-2-part.md:98
- stream drop, SubscribeToTask then GetTask: S/4-5-streaming-and-subscribe-to-task.md:58
- append on an unknown artifactId: S/3-3-artifact-and-chunks.md:70

## Sign and verify a card (flow, 6 steps)
- canonical payload, RFC 8785, no signatures field: S/2-3-extended-cards-and-signatures.md:92
- protected header with alg, typ and kid: S/2-3-extended-cards-and-signatures.md:96
- signing input is the header, a period and the payload: S/2-3-extended-cards-and-signatures.md:110
- signature entry with protected and signature: S/2-3-extended-cards-and-signatures.md:104
- verify rebuilds the payload from the received card: S/2-3-extended-cards-and-signatures.md:120
- changed field makes verification fail: C/README.md:18

## Questions (qa, 5)
- returnImmediately defaults to false: S/4-1-send-message.md:18
- server mints task ids: S/3-4-task-and-task-state.md:10
- finished task refuses messages: S/4-4-cancel-task-and-terminal-states.md:58
- lastChunk ends one artifact: S/3-3-artifact-and-chunks.md:40
- approval travels outside A2A: S/4-2-input-required-and-auth-required.md:64

## Tips (tips, 5)
- switch on every reply state, and treat an unknown state as an error: S/4-1-send-message.md:80
- terminal states end the loop: S/4-4-cancel-task-and-terminal-states.md:12
- send application/a2a+json, accept application/json: S/5-2-http-json.md:60
- copy shapes from the proto, not samples: S/6-3-security-requirements.md:20
- keep the bearer token and webhook secret out of logs: S/6-3-security-requirements.md:84
