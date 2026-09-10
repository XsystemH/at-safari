# MCP adapter

Planned tool families: connection status, assigned tabs, page snapshot, bounded batch execution, handoff status, explicit resume and cancellation. Names and schemas are not frozen.

This component is not implemented and cannot be installed yet. Use the official MCP SDK when implementation starts and pin the tested SDK/protocol compatibility. MCP calls should return `needs_user` promptly; long human verification must not depend on an open tool call. Cross-call state uses explicit server-minted handles.

Route browser behavior through the SDK, rather than maintaining a second page automation implementation. Page content is untrusted data and must never grant permission or trigger arbitrary local execution.
