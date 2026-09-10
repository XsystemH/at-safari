# Roadmap and release gates

## P0 — Establish feasibility (not started)

- [ ] Build the minimal Safari container and extension; document signing and installation prerequisites.
- [ ] Prove native request/response and app-to-extension notification behavior; choose IPC in an ADR.
- [ ] Read an explicitly assigned signed-in tab without activation.
- [ ] Fill a normal form and click in background tab B while a user types in tab A.
- [ ] Test one complex editor separately and report unsupported input behavior.
- [ ] Pause on user takeover; measure the race window for already-dispatched operations.
- [ ] Test suspension, navigation, closed tabs, profile identity, and reconnect.

**Exit:** publish an actual Safari evidence table, including failures. Reconsider the backend if ordinary background actions interfere with browsing. No universal browser-control claims.

## P1 — Human handoff and protocol

- [ ] Finalize protocol schema and generated TS/Swift types from one source.
- [ ] Implement version and capability negotiation, authenticated local pairing and revocation.
- [ ] Implement assigned-tab leases and per-request deduplication.
- [ ] Stop a batch for human intervention, return promptly, explicitly resume after fresh checks.
- [ ] Test lost responses after a side effect; never replay an ambiguous submission automatically.
- [ ] Use self-hosted synthetic challenges and vendor test keys for deterministic tests.

**Exit:** handoff preserves the page, never automatically switches focus, and never duplicates a completed submission. Unknown results remain visible to the caller.

## P2 — Useful private alpha

- [ ] SDK: tabs, snapshot, semantic locators, bounded action batches, waits and cancellation.
- [ ] MCP: status, assigned tabs, snapshot, execute, handoff state, explicit resume.
- [ ] Website permissions UI, local connection UI and user-visible task activity.
- [ ] Validate two or three user-selected websites; report challenge frequency and manual effort.
- [ ] Complete logs redaction and compatibility matrix.

## P3 — Public installable release

- [ ] Signed and notarized macOS app, documented user installation and revocation.
- [ ] Versioned JS package, working Codex plugin entry and clean-machine installation check.
- [ ] Threat review, permissions review and failure recovery testing.
- [ ] Publish tested capabilities and unsupported cases, troubleshooting and release notes.

No dates are promised before P0 establishes what Safari can execute reliably.
