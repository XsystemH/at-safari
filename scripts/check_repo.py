"""Dependency-free JSON, plugin manifest and Markdown-link checks."""
import json
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
errors = []
documents = {}
for path in ROOT.rglob('*.json'):
    if any(p in path.relative_to(ROOT).parts for p in ('.git','node_modules','work','runtime')):
        continue
    try:
        documents[path.relative_to(ROOT).as_posix()] = json.loads(path.read_text())
    except (ValueError, OSError) as exc:
        errors.append(f'{path.relative_to(ROOT)}: {exc}')

manifest = documents.get('plugins/at-safari/.codex-plugin/plugin.json', {})
if manifest.get('name') != 'at-safari':
    errors.append('Plugin name must match its enclosing folder: at-safari')
if manifest.get('mcpServers') != './.mcp.json':
    errors.append('Plugin must expose its companion MCP config')

for path in ROOT.rglob('*.md'):
    if any(p in path.relative_to(ROOT).parts for p in ('.git','node_modules','work','runtime')):
        continue
    for target in re.findall(r'\[[^\]]*\]\(([^\s)]+)\)', path.read_text()):
        parsed = urlsplit(target)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        resolved = (path.parent / unquote(parsed.path)).resolve()
        if not resolved.is_relative_to(ROOT) or not resolved.exists():
            errors.append(f'{path.relative_to(ROOT)}: invalid local link {target}')

if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(documents)} JSON files, manifest and local Markdown links')
print('Scope: static repository checks only; run the runtime suite and separate Safari integration checks.')
