#!/usr/bin/env bash
# Install Electron binary into node_modules/electron/dist (fixes "Electron uninstall").
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ELECTRON_DIR="$ROOT/node_modules/electron"
VERSION="$(node -p "require('${ELECTRON_DIR}/package.json').version" 2>/dev/null || echo '34.2.0')"
PLATFORM_PATH="electron"
DEST="$ELECTRON_DIR/dist/$PLATFORM_PATH"
PATH_TXT="$ELECTRON_DIR/path.txt"
SYS_ELECTRON_DIR="/usr/lib/electron"

link_system_electron() {
  local sys="$SYS_ELECTRON_DIR/electron"
  if [[ ! -x "$sys" ]]; then
    return 1
  fi
  echo "Using system Electron from $SYS_ELECTRON_DIR (Arch/electron package)"
  rm -rf "$ELECTRON_DIR/dist"
  mkdir -p "$ELECTRON_DIR/dist"
  # Copy or link full system electron tree so libffmpeg.so etc. resolve
  for item in "$SYS_ELECTRON_DIR"/*; do
    name="$(basename "$item")"
    [[ "$name" == "resources" ]] && continue
    if [[ -e "$ELECTRON_DIR/dist/$name" ]]; then
      continue
    fi
    ln -sf "$item" "$ELECTRON_DIR/dist/$name"
  done
  printf '%s' "$PLATFORM_PATH" >"$PATH_TXT"
  if [[ ! -e "$ELECTRON_DIR/dist/version" ]] || [[ -w "$ELECTRON_DIR/dist/version" ]]; then
    echo "$(cat "$SYS_ELECTRON_DIR/version" 2>/dev/null || echo "$VERSION")" >"$ELECTRON_DIR/dist/version"
  fi
  echo "Linked $DEST -> $sys"
  return 0
}

electron_runs() {
  [[ -x "$DEST" ]] && "$DEST" --version >/dev/null 2>&1
}

fix_missing_libs() {
  local missing
  missing="$(ldd "$DEST" 2>/dev/null | rg 'not found' || true)"
  [[ -z "$missing" ]] && return 0

  echo "Missing libraries for bundled Electron:"
  echo "$missing"

  if [[ -d "$SYS_ELECTRON_DIR" ]]; then
    echo "Patching from $SYS_ELECTRON_DIR ..."
    for lib in "$SYS_ELECTRON_DIR"/*.so*; do
      [[ -e "$lib" ]] || continue
      name="$(basename "$lib")"
      if [[ ! -e "$ELECTRON_DIR/dist/$name" ]]; then
        ln -sf "$lib" "$ELECTRON_DIR/dist/$name"
      fi
    done
    if electron_runs; then
      echo "Patched; Electron runs."
      return 0
    fi
    echo "Patch failed; switching to system Electron."
    link_system_electron
    return 0
  fi
  return 1
}

if electron_runs; then
  echo "Electron already installed at $DEST"
  exit 0
fi

if [[ "${ELECTRON_SKIP_BINARY_DOWNLOAD:-}" == "1" || "${ELECTRON_SKIP_BINARY_DOWNLOAD:-}" == "true" ]]; then
  link_system_electron || {
    echo "Set ELECTRON_SKIP_BINARY_DOWNLOAD=1 but system Electron not found."
    echo "Install: sudo pacman -S electron"
    exit 1
  }
  exit 0
fi

# On Arch Linux, npm-downloaded Electron often misses libffmpeg.so unless the full zip is extracted.
if [[ -f /etc/arch-release ]] && [[ -d "$SYS_ELECTRON_DIR" ]] && command -v pacman >/dev/null 2>&1; then
  if pacman -Q electron &>/dev/null || pacman -Q electron34 &>/dev/null 2>&1; then
    if link_system_electron && electron_runs; then
      exit 0
    fi
  fi
fi

echo "Installing Electron v$VERSION for linux x64..."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ZIP="electron-v${VERSION}-linux-x64.zip"
URL="https://github.com/electron/electron/releases/download/v${VERSION}/${ZIP}"

if command -v curl >/dev/null 2>&1; then
  curl -fL --progress-bar "$URL" -o "$TMP/electron.zip"
else
  wget -q --show-progress "$URL" -O "$TMP/electron.zip"
fi

rm -rf "$ELECTRON_DIR/dist"
mkdir -p "$ELECTRON_DIR/dist"
unzip -q -o "$TMP/electron.zip" -d "$TMP/extract"
# Full zip layout: electron, libffmpeg.so, locales/, *.pak, etc.
cp -a "$TMP/extract"/* "$ELECTRON_DIR/dist/"
chmod +x "$DEST" 2>/dev/null || true

printf '%s' "$PLATFORM_PATH" >"$PATH_TXT"
echo "$VERSION" >"$ELECTRON_DIR/dist/version"
echo "Installed Electron to $ELECTRON_DIR/dist/"

if ! electron_runs; then
  fix_missing_libs || {
    echo "Electron still cannot run. On Arch: sudo pacman -S electron && ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm run install-electron"
    exit 1
  }
fi
