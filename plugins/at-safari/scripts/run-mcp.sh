#!/bin/bash
set -euo pipefail
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -n "${AT_SAFARI_NODE:-}" ]]; then
  NODE_BIN="$AT_SAFARI_NODE"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [[ -x /opt/homebrew/bin/node ]]; then
  NODE_BIN=/opt/homebrew/bin/node
elif [[ -x /usr/local/bin/node ]]; then
  NODE_BIN=/usr/local/bin/node
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  NODE_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  echo 'at-safari requires Node.js 22+. Install it or set AT_SAFARI_NODE.' >&2
  exit 1
fi
exec "$NODE_BIN" "$PLUGIN_DIR/runtime/main.mjs" "$@"
