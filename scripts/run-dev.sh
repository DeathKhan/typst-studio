#!/usr/bin/env bash
# Dev launcher: ensure Electron + optional LD_LIBRARY_PATH for Arch.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
bash "$ROOT/scripts/install-electron.sh"
if [[ -d /usr/lib/electron ]] && [[ -f "$ROOT/node_modules/electron/dist/electron" ]]; then
  export LD_LIBRARY_PATH="/usr/lib/electron${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi
exec npm run dev -- "$@"
