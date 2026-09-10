# Safari app and extension

Planned: an Xcode macOS app containing a Safari Web Extension and native message handler. The extension owns tab assignment, site access, DOM execution and user handoff; the Swift layer owns the app/extension communication boundary and local bridge integration.

No Xcode project or runnable extension is present yet. Create the smallest native messaging and background-tab spike in P0 before committing to a production transport.

Keep native handler and Web Extension versions aligned in one app release. Do not add blanket website access or automatically install/enable the extension as part of a repository check. See [architecture](../../docs/architecture.md) and [maintenance](../../docs/maintenance.md).
