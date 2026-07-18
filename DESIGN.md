---
name: Keypt
description: A compact, calm visual system for a private clipboard shortcut.
colors:
  background: 'oklch(1 0 0)'
  surface: 'oklch(0.972 0.006 250)'
  surface-strong: 'oklch(0.94 0.01 250)'
  ink: 'oklch(0.2 0.018 250)'
  muted: 'oklch(0.45 0.02 250)'
  line: 'oklch(0.9 0.008 250)'
  line-strong: 'oklch(0.82 0.014 250)'
  primary: 'oklch(0.55 0.149 250)'
  primary-soft: 'oklch(0.945 0.028 250)'
  accent: 'oklch(0.78 0.13 82)'
  accent-soft: 'oklch(0.95 0.045 82)'
  danger: 'oklch(0.47 0.18 25)'
  dark-background: 'oklch(0.15 0.012 250)'
  dark-surface: 'oklch(0.19 0.014 250)'
  dark-ink: 'oklch(0.94 0.006 250)'
  dark-muted: 'oklch(0.72 0.018 250)'
typography:
  search:
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI Variable, Segoe UI, sans-serif'
    fontSize: '16px'
    fontWeight: 480
    lineHeight: 1.2
    letterSpacing: '-0.012em'
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI Variable, Segoe UI, sans-serif'
    fontSize: '14px'
    fontWeight: 680
    lineHeight: 1.2
    letterSpacing: '-0.008em'
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI Variable, Segoe UI, sans-serif'
    fontSize: '13px'
    fontWeight: 530
    lineHeight: 1.35
    letterSpacing: 'normal'
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI Variable, Segoe UI, sans-serif'
    fontSize: '11.5px'
    fontWeight: 620
    lineHeight: 1.35
    letterSpacing: 'normal'
  code:
    fontFamily: 'SFMono-Regular, Cascadia Code, Cascadia Mono, Consolas, monospace'
    fontSize: '12px'
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 'normal'
rounded:
  control-sm: '7px'
  control: '8px'
  preview: '8px'
  row: '8px'
  panel: '12px'
  pill: '999px'
spacing:
  xxs: '4px'
  xs: '8px'
  sm: '12px'
  md: '18px'
  lg: '20px'
components:
  panel:
    backgroundColor: '{colors.background}'
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
    width: '600px'
    height: '500px'
  search-field:
    backgroundColor: '{colors.background}'
    textColor: '{colors.ink}'
    typography: '{typography.search}'
    padding: '0 12px'
    height: '50px'
  clipboard-row:
    backgroundColor: '{colors.background}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.row}'
    padding: '4px 8px'
    height: '56px'
  clipboard-row-selected:
    backgroundColor: '{colors.primary-soft}'
    textColor: '{colors.ink}'
    rounded: '{rounded.row}'
  secondary-button:
    backgroundColor: '{colors.background}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '5px 10px'
    height: '30px'
  pinned-chip:
    backgroundColor: '{colors.accent-soft}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.pill}'
    padding: '2px 4px'
---

# Design System: Keypt

## Overview

**Creative North Star: "The Quiet Shortcut"**

Keypt should feel like a well-made key on the keyboard: immediately legible, pleasantly tactile, and absent from attention once pressed. The system uses dense native proportions, cool neutral surfaces, one cobalt action color, and a small amber pin signal. Identity comes from rhythm and restraint rather than decoration.

The panel is a single fixed composition, not a miniature dashboard. It should never resemble a feature-dense clipboard workspace, cloud-backed knowledge base, neon developer console, glassmorphic launcher, or dashboard made of cards. State changes are quick and functional; reduced-motion settings remove them completely.

**Key Characteristics:**

- Compact, fixed geometry built around a 600 × 500 desktop panel.
- Native system typography with a monospace exception for copied code.
- Flat tonal layers, one-pixel separators, and no interior shadows.
- Cobalt for selection and interaction; amber only for pinned state.
- Direct, honest copy with visible keyboard affordances.

## Colors

The palette is a restrained cool-neutral field with a cobalt primary and a deliberately rare amber marker.

### Primary

- **Shortcut Cobalt:** Primary actions, current selection, focus, and interactive emphasis. It must never become decorative wallpaper.

### Secondary

- **Pinned Amber:** Reserved for the detached key tile in the mark and pinned state. It is a locator, not a second call-to-action color.

### Neutral

- **Paper / Night:** The background tokens define the only full-panel surfaces in light and dark themes.
- **Cool Surface:** Secondary layers distinguish the footer, icon wells, segmented controls, and loading states.
- **Ink / Muted Ink:** Ink carries task content; muted ink carries metadata and remains WCAG AA compliant.
- **Hairline:** One-pixel separators establish structure without turning the panel into a grid.

**The One Active Color Rule.** Cobalt is used only for an active, selected, focused, or actionable state; inactive content stays neutral.

**The Amber Means Kept Rule.** Amber means pinned or the brand key tile—nothing else.

## Typography

- **Display Font:** System UI stack with San Francisco on macOS and Segoe UI Variable on Windows
- **Body Font:** The same native system UI stack
- **Label/Mono Font:** SFMono on macOS and Cascadia/Consolas on Windows

**Character:** Familiar native letterforms keep the tool quiet and fast to scan. Weight and spacing—not competing font families—create hierarchy; monospace is semantic and appears only for code.

### Hierarchy

- **Search:** The largest text in the panel, medium weight and slightly tight, because search is the opening action.
- **Title:** Compact semibold headings for settings and empty states.
- **Body:** Dense medium-weight clipboard previews limited to a single line in history.
- **Label:** Small semibold controls and metadata with tabular numerals where time or counts change.
- **Code:** A compact platform-native monospace preview, never used as developer-themed decoration.

**The Native Voice Rule.** Never introduce a display face or branded webfont into the application shell.

**The One-Line Recall Rule.** History previews stay on one line; the panel recalls content, it does not become an editor.

## Elevation

Keypt is flat inside the panel. Tonal layers and one-pixel borders communicate grouping; the operating system supplies the only window shadow. Hover and selection change background color rather than lifting controls.

**The OS Owns the Shadow Rule.** Never add card shadows, inner glows, or glass blur. If a surface needs structure, use the existing surface or hairline tokens.

## Components

### Search Field

- **Shape:** Borderless within the panel header; the header hairline turns cobalt on focus.
- **Behavior:** Receives focus whenever the panel opens and never shows a redundant inner focus box.
- **Content:** Search icon, input, live result count, and one settings icon—nothing more.

### Clipboard Row

- **Shape:** Gently curved row corners using the row radius and a compact three-column grid.
- **Content:** One preview, semantic type treatment, source app, age, and pinned state. Time yields to row actions on pointer hover or control focus.
- **Mouse:** A single row click copies the item and closes the panel; pin and delete remain isolated actions.
- **States:** Default is neutral; hover and keyboard selection share the same soft cobalt surface; focus remains visibly outlined.

### Buttons and Icon Buttons

- **Shape:** Compact control corners with 30–32px targets inside this keyboard-first desktop tool.
- **Secondary:** Neutral background and a one-pixel hairline; hover uses cobalt border/text.
- **Danger:** Danger color appears only after explicit destructive intent and always has adjacent plain-language confirmation.

### Toggles and Segmented Controls

- **Style:** Familiar native proportions, neutral inactive states, and cobalt active states.
- **Motion:** State transitions use the shared short ease and disappear under reduced motion.

### Chips and Type Previews

- **Pinned chip:** Amber-tinted pill with both icon and text so color is not the sole signal.
- **Type preview:** A compact square well for text, link, or code; images use a thumbnail and colors use the copied swatch.

## Do's and Don'ts

### Do:

- **Do** optimize the visible hierarchy for search, selection, and Enter in that order.
- **Do** use source app and copied time as quiet metadata, never as competing badges.
- **Do** preserve visible focus, reduced-motion behavior, and forced-colors fallbacks in every component.
- **Do** state sensitive-data limitations plainly when an operating system cannot provide a guarantee.
- **Do** use one-pixel borders and existing tonal surfaces before adding any new visual treatment.

### Don't:

- **Don't** turn Keypt into a feature-dense clipboard “workspace” or a dashboard made of cards.
- **Don't** introduce cloud-backed knowledge-base patterns, accounts, sync status, or collaboration UI.
- **Don't** style the app like a neon developer console; monospace is for copied code only.
- **Don't** use glassmorphism, translucent cards, gradients, glowing borders, or decorative blur.
- **Don't** hide sensitive-data caveats behind vague “privacy-first” language.
- **Don't** decorate the core paste loop at the expense of speed or familiarity.
