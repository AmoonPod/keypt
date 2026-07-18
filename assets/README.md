# Keypt source assets

The SVG files in this directory are the editable brand sources. Run `npm run generate:icons` to
regenerate platform packaging and tray assets.

- `app-icon.svg` is the stable application icon source.
- `tray-template.svg` is the monochrome macOS menu-bar source.
- `tray-windows.svg` is the Windows notification-area source.

Generated packaging assets live under `build/`, runtime tray assets under `resources/`, screenshots
under `docs/screenshots/`, and release artifacts under the ignored `release/` directory.
