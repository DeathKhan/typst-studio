# Typst Studio

Desktop editor for [Typst](https://typst.app/) with live HTML preview, LSP diagnostics, and PDF export.

Typst Studio runs [Tinymist](https://github.com/Myriad-Dreamin/tinymist) for language support and preview, with a CodeMirror 6 editor and an Electron-based preview pane.

## Features

- Live HTML preview (Tinymist) with source ↔ preview navigation
- PDF preview and export via the `typst` CLI
- Document outline, diagnostics panel, and find-in-file
- Tinymist autocomplete (Ctrl+Space)
- Paste images from the clipboard into `assets/` as `#image(...)`
- Optional Vim mode
- Light/dark editor themes and configurable layout

## Install

### Linux (AppImage)

Download the latest AppImage from [GitHub Releases](https://github.com/DeathKhan/typst-studio/releases), make it executable, and run it:

```bash
chmod +x typst-studio-*.AppImage
./typst-studio-*.AppImage
```

**Runtime dependencies** (not bundled in the AppImage):

| Package | Arch | Debian / Ubuntu | Fedora |
|---------|------|-----------------|--------|
| FUSE 2 (required to launch AppImages) | `fuse2` | `libfuse2` | `fuse` |
| GTK 3 (Electron UI / dialogs) | `gtk3` | `libgtk-3-0` | `gtk3` |

Example on Arch:

```bash
sudo pacman -S fuse2 gtk3
```

If FUSE is unavailable, you can run `./typst-studio-*.AppImage --appimage-extract-and-run` (slower startup; extracts to a temp dir each time).

The AppImage bundles Tinymist. Install the [Typst CLI](https://github.com/typst/typst) separately if you want PDF export or PDF preview mode. Prefer the `.deb` on Debian/Ubuntu if you want `apt` to pull dependencies automatically.

### Windows

Download `typst-studio-*-win.zip` from [GitHub Releases](https://github.com/DeathKhan/typst-studio/releases), extract, and run `Typst Studio.exe`. Tinymist is bundled; install [Typst](https://github.com/typst/typst) for PDF export.

### Arch Linux (AUR)

```bash
yay -S typst-studio-bin
```

The AUR package extracts the AppImage at install time and runs `/opt/typst-studio/AppRun`, so **FUSE is not required** to launch the app. Requires [Typst](https://archlinux.org/packages/extra/x86_64/typst/) for PDF export. Tinymist is bundled.

### Build from source

**Requirements**

- Node.js 20+
- A graphical session (X11 or Wayland)
- [Typst](https://github.com/typst/typst) on `PATH` for PDF export / PDF preview
- Tinymist — downloaded automatically by `npm install`, or install [tinymist](https://github.com/Myriad-Dreamin/tinymist) yourself

```bash
git clone https://github.com/DeathKhan/typst-studio.git
cd typst-studio
npm install
npm run dev
```

To produce release artifacts locally:

```bash
npm run dist
```

Output lands in `release/` (AppImage and `.deb` on Linux). The `predist` step always downloads Tinymist into `resources/bin/` for packaging, even if you have `tinymist` on `PATH`.

## Arch Linux notes

If development fails with `libffmpeg.so: cannot open shared object file`, use the system Electron package:

```bash
sudo pacman -S electron typst
npm run install-electron
npm run dev
```

Or link system Electron explicitly:

```bash
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm run install-electron
npm run dev
```

If you see **"Electron uninstall"**, the Electron binary was not installed:

```bash
npm run install-electron
npm run dev
```

## Usage

Settings are stored in `~/.config/typst-studio/settings.json`.

On first launch, Typst Studio opens a sample document from `examples/welcome.typ`. Use **File → Open** to edit your own `.typ` files.

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save |
| Ctrl+F | Find in file |
| Ctrl+Space | Autocomplete |

With Vim mode enabled, use `:w` to save and `/` to search.

Paste a screenshot or image with Ctrl+V to save it under `assets/` next to the current file and insert a `#image("assets/…")` reference.

## Tinymist version

The default bundled version is **v0.14.16**. Override when downloading:

```bash
TINYMIST_VERSION=v0.14.16 npm run download-tinymist
```

## License

Copyright © 2026 DeathkKhan

Licensed under [GPL-3.0-or-later](LICENSE).
