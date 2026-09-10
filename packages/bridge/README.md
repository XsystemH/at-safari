# Local bridge / session coordinator

Planned: authenticated local connection, protocol negotiation, assigned-tab leases, bounded queues, cancellation, result bookkeeping and reconnect reconciliation.

This component is not implemented. The Swift-to-JS transport is an explicit P0 research gate. Browser numeric IDs are not authorization; validate session, profile, document and lease before every mutation. A disconnected caller must not leave an unlimited task queue running.

Keep DOM behavior in the Safari backend. See [protocol](../protocol/README.md).
