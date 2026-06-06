#!/usr/bin/env bash
# Download tinymist binary for the current platform.
set -euo pipefail

VERSION="${TINYMIST_VERSION:-v0.14.16}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="$ROOT/resources/bin"
mkdir -p "$BIN_DIR"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) TRIPLE="x86_64-unknown-linux-gnu" EXT="tar.gz" ;;
  aarch64|arm64) TRIPLE="aarch64-unknown-linux-gnu" EXT="tar.gz" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

if [[ "$OS" == "darwin" ]]; then
  TRIPLE="x86_64-apple-darwin"
  [[ "$ARCH" == "arm64" || "$ARCH" == "aarch64" ]] && TRIPLE="aarch64-apple-darwin"
  EXT="tar.gz"
elif [[ "$OS" == "mingw"* || "$OS" == "msys"* ]]; then
  TRIPLE="x86_64-pc-windows-msvc"
  EXT="zip"
fi

ARCHIVE="tinymist-${TRIPLE}.${EXT}"
URL="https://github.com/Myriad-Dreamin/tinymist/releases/download/${VERSION}/${ARCHIVE}"
DEST="$BIN_DIR/tinymist"
[[ "$EXT" == "zip" ]] && DEST="$BIN_DIR/tinymist.exe"

if [[ -x "$DEST" ]]; then
  echo "tinymist already present at $DEST"
  exit 0
fi

# Release builds set FORCE_BUNDLE=1 (see npm run predist) so AppImage/deb always ship tinymist.
if [[ "${FORCE_BUNDLE:-}" != "1" ]] && command -v tinymist >/dev/null 2>&1; then
  echo "Using tinymist from PATH (not bundling)"
  exit 0
fi

echo "Downloading $URL ..."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$URL" -o "$TMP/archive.$EXT"
else
  wget -q "$URL" -O "$TMP/archive.$EXT"
fi

if [[ "$EXT" == "zip" ]]; then
  unzip -q -o "$TMP/archive.zip" -d "$TMP"
else
  tar -xzf "$TMP/archive.tar.gz" -C "$TMP"
fi

FOUND="$(find "$TMP" -name 'tinymist*' -type f ! -name '*.sha256' | head -1)"
if [[ -z "$FOUND" ]]; then
  echo "tinymist binary not found in archive"
  exit 1
fi
cp "$FOUND" "$DEST"
chmod +x "$DEST"
echo "Installed $DEST"
