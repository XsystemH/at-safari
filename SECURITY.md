# Security and privacy

There is no runnable release yet. The design gives agents access to user-authorized Safari pages, so tab identity, permission scope and local client authentication are core correctness requirements.

Do not publish secrets or private page contents in issues. To report a future vulnerability, use GitHub private vulnerability reporting if enabled; otherwise contact the repository owner privately through an available channel. Do not post exploit details in a public bug report before coordination.

Required design properties:

- Explicit user assignment of tabs and sites; revocation stops subsequent operations.
- Authenticated local IPC; no public listener and no website-accessible unauthenticated control endpoint.
- Page content cannot authorize commands, expand permissions, or become arbitrary local code.
- No export of browser credentials or CAPTCHA response tokens. Diagnostic logs omit page contents and URL query strings by default.
- Human intervention suspends writes. Ambiguous side effects are surfaced rather than replayed.
- No fingerprints, user-agent overrides or challenge solver services intended to evade website verification.

Human handoff is a product boundary, not a promise that every website accepts automation or that manual verification always succeeds.
