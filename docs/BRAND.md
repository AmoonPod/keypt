# Keypt brand

## Product name

**Keypt** combines “key” and “kept.” It is pronounced “kept”: a keyboard-first tool that keeps only the clipboard history you need. The spelling is compact and distinctive without leaning on the crowded “clip” or “paste” vocabulary.

The positioning line is:

> Your clipboard, one shortcut back.

The product voice is calm, precise, and discreet. Sentences are short. Privacy copy describes behavior and limitations; it never substitutes adjectives for guarantees.

## Obvious-conflict screen

A practical naming screen was completed on **17 July 2026** across general web search, product and developer-tool searches, GitHub-oriented results, npm, exact GitHub repository lookup, and DNS for common product domains.

- Exact searches for “Keypt” as an app, clipboard manager, software product, and developer tool did not surface an active same-category product.
- The exact npm package `keypt` and GitHub repository `keypt/keypt` were not present when checked. The implementation uses the more descriptive package identifier `keypt-clipboard`.
- Common `keypt` product domains had no DNS records when checked. This is not evidence that they are available to register.
- **Crumb**, the first candidate, was rejected after a deeper screen found [an active macOS developer tool using that name](https://getcrumb.app/). Category-obvious candidates were also rejected because direct clipboard products already exist, including [Clipwell](https://clipwell.dev/) and [Yank](https://yankclip.com/).

This is an obvious-collision screen, not legal or trademark clearance. It does not reserve a GitHub organization, domain, package name, store listing, or trademark. Maintainers should repeat marketplace and legal checks before public distribution.

## Mark

The mark is two overlapping rounded rectangles—the universal copy/history gesture—with a small detached amber square. The square is the key tile: a compact signal that an item has been kept, and the same visual cue used for pinned items.

- **App icon:** cobalt rounded-square field, white copy mark, amber key tile.
- **Favicon:** the same app mark, exported as SVG, ICO, and 16/32px PNG fallbacks.
- **macOS tray:** 18px and 36px black template PNGs; macOS supplies light/dark coloring.
- **Windows tray:** 32px monochrome light mark with transparent background for reliable visibility in the notification area.
- **In-app mark:** current-color copy outline with an amber key tile, allowing it to sit on light and dark surfaces.

Editable sources live in [`assets/`](../assets/). Package outputs live in [`build/`](../build/), runtime desktop assets in [`resources/`](../resources/), and generated renderer icons in [`src/renderer/public/`](../src/renderer/public/). Run `npm run generate:icons` after editing a source SVG.

## Typography

Keypt uses the native system UI stack: San Francisco on macOS and Segoe UI Variable/Segoe UI on Windows. Code previews use SFMono, Cascadia Code/Cascadia Mono, then Consolas. There are no downloaded fonts, display faces, or typographic brand effects.

This is intentional: the interface should look integrated with the operating system and incur no network, font-loading, or licensing dependency.

## Color

The canonical UI tokens are OKLCH values in [`styles.css`](../src/renderer/src/styles.css) and [`DESIGN.md`](../DESIGN.md).

- **Shortcut Cobalt:** active selection, focus, primary state, and the app-icon field.
- **Pinned Amber:** the brand key tile and pinned state only.
- **Cool neutrals:** background, surfaces, ink, metadata, and one-pixel structure.
- **Delete Red:** destructive intent and confirmation only.

The UI is restrained: cobalt should not fill inactive surfaces, and amber should never become a generic warning or button color. Gradients, neon, glass effects, and interior card shadows are outside the system.

## Asset rules

- Keep the tray silhouette recognizable at 16–18px; do not add text, internal hairlines, or the amber tile there.
- Generate every colored app and browser icon from `app-icon.svg`; never hand-edit an exported PNG, ICO, or ICNS file.
- Preserve clear space of at least one key-tile square around the app mark.
- Do not place the colored app icon inside another rounded tile.
- Do not recolor the copy mark independently from the containing platform treatment.
- Use “Keypt” in title case. Use `keypt-clipboard` only where a technical package identifier needs disambiguation.

The complete component and token rules are in [`DESIGN.md`](../DESIGN.md).
