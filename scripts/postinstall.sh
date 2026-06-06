#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Electron"
bash "$ROOT/scripts/install-electron.sh"

echo "==> Tinymist"
bash "$ROOT/scripts/download-tinymist.sh" || true

echo "==> Typst syntax WASM (CodeMirror highlighting)"
mkdir -p "$ROOT/src/renderer/assets"
if [ -f "$ROOT/node_modules/codemirror-lang-typst/wasm/typst_syntax_bg.wasm" ]; then
  cp -f "$ROOT/node_modules/codemirror-lang-typst/wasm/typst_syntax_bg.wasm" \
    "$ROOT/src/renderer/assets/typst_syntax_bg.wasm"
else
  echo "warn: codemirror-lang-typst not installed; run npm install" >&2
fi

