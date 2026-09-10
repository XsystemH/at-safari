# Internal bridge protocol — draft 0.1

This is an illustrative design contract, not an implemented or stable API. It is distinct from MCP. Fixtures use fictional identifiers and `example.org`; they contain no real browser state or credentials.

## Handshake

Exchange `component`, `componentVersion`, `supportedProtocolVersions`, `capabilities`, and a connection nonce over authenticated local IPC. The receiver selects an explicit common version. Version strings are exact matches; do not guess compatibility. Authentication is a transport prerequisite, not satisfied by a nonce alone.

The user-approved tab assignment is represented by a server-minted opaque handle scoped to a connection/session, Safari profile instance, and document identity. Browser numeric tab IDs are not authorization. New document generations invalidate old element references; reconnect invalidates old leases until revalidated.

## Proposed message envelope

| Field | Meaning |
| --- | --- |
| `protocolVersion` | Negotiated internal version |
| `requestId` | Unique request ID for this session; repeat IDs cannot execute a second mutation |
| `sessionId` | Explicit server-minted session handle |
| `type` | Operation/event identifier |
| `payload` | Typed payload for the operation |

Requests require a deadline and validated tab lease at the action layer. Batch steps carry unique IDs; each result distinguishes `completed`, `not_started`, `failed`, and `unknown`. Stop at the first blocking outcome. A timeout is not proof of non-execution.

## Human handoff

An `execution.result` can return `status: needs_user`, a `handoffId`, a stable reason code, completed/not-started step IDs, and a safe next action. The server mints the handoff ID, binds it to the session and assigned tab, and rejects stale or replayed resumes.

Resume requires a deliberate user completion signal plus current tab/document and permission checks. An agent-generated `resume` call alone is not evidence that a human completed verification. Do not transmit challenge response tokens, Cookie headers, passwords or full DOM in handoff messages.

Reasons initially proposed: `challenge`, `user_takeover`, `login_required`, `foreground_required`, `ambiguous_result`. Each has different recovery semantics; a login prompt is not automatically a CAPTCHA.

Connection state, task state and per-step execution state are separate. Closing a transport cancels unsent actions but may leave in-flight side effects unknown. Persist only the minimum metadata needed to expose that ambiguity; never replay from a queue after process restart without reconciliation.

## Capability negotiation

Report capabilities individually, such as `tabs.assigned`, `page.snapshot`, `dom.fill`, `dom.click`, `batch.bounded`, `handoff.manual`. Only advertise a capability after its runtime implementation is present and tested. Trusted input and background screenshots must have separate flags if later supported.

## Examples

- [Illustrative hello](fixtures/hello.json)
- [Illustrative paused batch](fixtures/needs-user.json)

Next step: formal schemas, generated language types and executable compatibility tests during P1. Current CI checks fixture envelope consistency only.
