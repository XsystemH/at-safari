# Contributing

The project is in its design phase. Start with the [roadmap](docs/roadmap.md) and keep implementation claims tied to actual Safari evidence.

- Make protocol changes in the same PR as affected adapters and fixtures.
- Keep browser behavior in the Safari backend and client-specific behavior in adapters.
- Do not copy proprietary browser plugin sources or assets. Add attribution and license information for any third-party code you introduce.
- Use synthetic pages and test accounts. Never commit browser profiles, cookies, tokens, signing certificates, screenshots of private pages, or full production DOM traces.
- Document tested macOS/Safari and component versions, background focus behavior and human-handoff behavior for runtime changes.
- Keep signing and distribution changes separate from ordinary build changes.

Run `python3 scripts/check_repo.py` before a PR. This is scaffold validation only. Add meaningful protocol/Safari tests as those components are implemented.

No dependency manager, runtime SDK version, IPC implementation or release pipeline has been selected yet. Propose these with a small working experiment and an architecture decision record.
