# Contributing

The project is a local development alpha. Start with the [roadmap](docs/roadmap.md) and keep implementation claims tied to actual Safari evidence.

- Make protocol changes in the same PR as affected adapters and fixtures.
- Keep browser behavior in the Safari backend and client-specific behavior in adapters.
- Do not copy proprietary browser plugin sources or assets. Add attribution and license information for any third-party code you introduce.
- Use synthetic pages and test accounts. Never commit browser profiles, cookies, tokens, signing certificates, screenshots of private pages, or full production DOM traces.
- Document tested macOS/Safari and component versions, background focus behavior and human-handoff behavior for runtime changes.
- Keep signing and distribution changes separate from ordinary build changes.

Run `pnpm build`, `pnpm check`, `pnpm test` and `python3 scripts/check_repo.py` before a PR. Linux tests validate the broker, DOM fixtures and actual MCP transport; Safari regressions require a Mac and a separate manual evidence record.

Use pnpm and the committed lockfile. The current transport is Swift native messaging plus authenticated loopback HTTP. Keep the JavaScript runtime and native handler protocol compatible in a single PR. Generated Xcode projects, app binaries and bundled runtime files stay outside Git.
