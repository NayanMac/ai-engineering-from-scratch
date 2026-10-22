# Evidence: cheatsheets/a2a.md

Abbreviations: M = manuals/a2a-101, S = manuals/a2a-101/sections.

## Protocol stack (architecture, 6 nodes)
- planner, client agent: S/7-1-a-client.md:9
- agent card at the well-known path: S/2-2-discovery-and-supported-interfaces.md:22
- interface JSONRPC or HTTP+JSON: S/2-1-agentcard-fields.md:62
- executor, checks then agent logic: S/7-2-a-server.md:38, 72
- task store, one record per task: S/7-2-a-server.md:88
- event queue, streams fed to the client, webhook POST: S/7-2-a-server.md:60, S/4-6-push-notification-configs.md:20

## One task, send to close (flow, 6 steps)
1. client sends SendMessage with a fresh messageId: S/1-2-one-task-request-by-request.md:34
2. server creates the task in TASK_STATE_SUBMITTED: S/1-2-one-task-request-by-request.md:48
3. agent sets TASK_STATE_WORKING and streams chunks: S/1-2-one-task-request-by-request.md:58
4. agent stops at TASK_STATE_INPUT_REQUIRED, answer with same ids: S/4-2-input-required-and-auth-required.md:24
5. operator approves TASK_STATE_AUTH_REQUIRED outside A2A: S/4-2-input-required-and-auth-required.md:84
6. terminal state closes the stream, then GetTask: S/4-5-streaming-and-subscribe-to-task.md:42

## Call the protocol (task-table, 6 rows)
- Read a card, GET /.well-known/agent-card.json: S/2-2-discovery-and-supported-interfaces.md:22
- Send and wait, SendMessage: S/5-1-json-rpc.md:30
- Stream a task, SendStreamingMessage: S/1-2-one-task-request-by-request.md:12
- Reattach, POST /tasks/{id}:subscribe: S/5-2-http-json.md:14
- Declare the version, A2A-Version: 1.0: S/5-4-version-and-extension-headers.md:24
- Approve outside A2A, POST /approve/<task id>: S/4-2-input-required-and-auth-required.md:84

## Run and check the kit (command-table, 6 rows)
- cd manuals/a2a-101: M/README.md:27
- python3 capture/run.py --check: M/README.md:28
- python3 capture/run.py records again: M/README.md:31
- figkit build command: M/README.md:36
- audit command, TOTAL 0: M/README.md:38
- run_tck.py against a server: S/7-3-conformance-testing.md:28

## Dispatch on a SendMessage reply (annotated-code, 4 facts)
- error checked first, HTTP 200 carries errors: S/4-1-send-message.md:112
- direct message returned with no task: S/4-1-send-message.md:118-120
- task state read from status: S/4-1-send-message.md:121
- TERMINAL holds four states: S/4-1-send-message.md:131

## Defaults (defaults, 6 rows)
- returnImmediately false: S/4-1-send-message.md:36
- pageSize 50, maximum 100: S/4-3-get-task-and-list-tasks.md:56
- includeArtifacts false: S/4-3-get-task-and-list-tasks.md:60
- streaming absent counts as false: S/2-1-agentcard-fields.md:76
- client request timeout 15 seconds: S/7-1-a-client.md:58
- A2A-Version 1.0 on every request: S/5-4-version-and-extension-headers.md:24

## Terms that decide the next call (concepts, 4)
- terminal state, four values, never changes: S/4-4-cancel-task-and-terminal-states.md:9
- interrupted state, input or auth, task waits: S/4-2-input-required-and-auth-required.md:12
- chunk joined by artifactId until lastChunk: S/3-3-artifact-and-chunks.md:40
- contextId groups tasks, server creates task id: S/3-5-context-id.md:12

## Troubleshooting (troubleshooting, 5)
- -32009 with 0.3 (no header), send A2A-Version 1.0: S/5-4-version-and-extension-headers.md:45
- -32601 on message/send, use SendMessage: S/7-4-from-0-3-to-1-0.md:12
- HTTP 401 before any method, bearer token: S/6-1-security-schemes-and-in-task-authorization.md:10
- -32002 on CancelTask after terminal, call GetTask: S/4-4-cancel-task-and-terminal-states.md:70
- -32602 with messageId is required: S/5-5-errors.md:60

## Glossary (glossary, 3)
- Agent card, JSON document at the well-known path: S/r-5-glossary.md:12
- Stream, SSE or gRPC of StreamResponse frames: S/r-5-glossary.md:30
- Extension, named by a URI, activated with A2A-Extensions: S/r-5-glossary.md:14

## Questions (qa, 3)
- blocking send waits by default, 3.1.1 disagrees: S/4-1-send-message.md:40
- stream closes at terminal, call GetTask after any close: S/4-5-streaming-and-subscribe-to-task.md:50
- approval is a person outside A2A: S/4-2-input-required-and-auth-required.md:86

## Tips (tips, 3)
- read capabilities before an optional call: S/2-2-discovery-and-supported-interfaces.md:85
- switch on states and ErrorInfo reason, not text: S/4-1-send-message.md:131
- rebuild a dropped stream from the Task snapshot: S/4-5-streaming-and-subscribe-to-task.md:75
