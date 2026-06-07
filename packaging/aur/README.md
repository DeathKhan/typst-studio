# AUR: typst-studio-bin

Packages the [Typst Studio](https://github.com/DeathKhan/typst-studio) AppImage release.

## Install

```bash
yay -S typst-studio-bin
```

Requires [typst](https://archlinux.org/packages/extra/x86_64/typst/) for PDF export. The package extracts the upstream AppImage at install time (no FUSE needed at runtime). Tinymist is bundled.

## Build locally

```bash
makepkg -si
```

## Publish updates

1. Clone `ssh://aur@aur.archlinux.org/typst-studio-bin.git` (or use `~/Projects/typst-studio-bin-aur`).
2. Bump `pkgver` / `pkgrel`, refresh checksums (`updpkgsums` or `makepkg -g`), run `makepkg --printsrcinfo > .SRCINFO`.
3. Commit and push to `master`.

When upstream releases a new version, update `pkgver` and the AppImage URL in `source=`.
