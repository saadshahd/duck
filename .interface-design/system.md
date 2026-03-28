# Visual Identity — json-render-editor

## Intent

**Who:** Designer reviewing AI-composed pages. Judgment mode, not creation mode. Attention on content, not tool.
**Task:** Inspect, approve, adjust. Hover → select → reorder → edit text → undo.
**Feel:** Precision lens over a finished page. The editor materializes on interaction, disappears when done. System-level, not application-level.

## Palette

Single spectral accent. One color = one system = no visual noise competing with the page.

| Token              | Value                         | Usage                                    |
|--------------------|-------------------------------|------------------------------------------|
| `--accent`         | `#3b82f6` (blue-500)         | All interactive editor indicators        |
| `--accent-hover`   | `rgba(59, 130, 246, 0.30)`   | Hover glow outline                       |
| `--accent-select`  | `rgba(59, 130, 246, 0.50)`   | Selection ring                           |
| `--accent-pulse`   | `rgba(59, 130, 246, 0.15)`   | Change highlight animation background    |
| `--surface-bar`    | `rgba(15, 23, 42, 0.95)`     | Floating action bar (dark, reads as tool)|
| `--surface-sheet`  | `rgba(255, 255, 255, 0.98)`  | History overlay (frosted glass)          |
| `--text-bar`       | `#f8fafc`                    | Text on dark floating bar                |
| `--text-bar-muted` | `#94a3b8`                    | Secondary text on floating bar           |
| `--text-sheet`     | `#1e293b`                    | Text on history overlay                  |
| `--border-subtle`  | `rgba(0, 0, 0, 0.08)`        | Dividers inside overlay surfaces         |
| `--drop-indicator` | `#3b82f6`                    | Drag-and-drop insertion line             |

**Why blue:** Universal selection language. Designers already parse blue = interactive/selected. Rarely dominant in content, so it reads against any catalog. The identity is in the restraint, not the hue.

**Why no secondary accent:** The editor is a single-concern tool (review). Multiple colors imply multiple systems. One accent keeps the overlay feeling like infrastructure.

## Depth

Minimal. Max 1 elevation level.

| Surface        | Shadow                              | Reason                                         |
|----------------|-------------------------------------|-------------------------------------------------|
| Floating bar   | `0 1px 3px rgba(0, 0, 0, 0.12)`    | Lifts off page without feeling like a panel     |
| History overlay| `none` (uses backdrop-blur instead) | Frosted glass reads as system sheet, not chrome |
| Drop indicator | `none`                              | A line, not a surface                           |

## Surfaces

| Surface         | Background                        | Backdrop             | Border radius |
|-----------------|-----------------------------------|----------------------|---------------|
| Floating bar    | `var(--surface-bar)`              | none                 | `8px`         |
| History overlay | `var(--surface-sheet)`            | `blur(16px)`         | `0` (edge-anchored) |
| Hover glow      | transparent                       | none                 | `4px`         |
| Selection ring  | transparent                       | none                 | `4px`         |

**Why dark floating bar:** Must read as "tool" against any content background — light, dark, colorful. Dark neutral is the only universal contrast. Matches system HUDs (macOS volume, Spotlight).

**Why frosted history overlay:** The one exception to zero-chrome. Backdrop blur makes it feel like it belongs to the viewport, not to a separate application. It's a sheet, not a panel.

## Typography

System font stack. The editor uses the OS font to feel native — no personality of its own.

```
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

| Context            | Size   | Weight | Letter-spacing |
|--------------------|--------|--------|----------------|
| Action bar labels  | `13px` | `500`  | `0`            |
| History entries    | `13px` | `400`  | `0`            |
| History timestamps | `12px` | `400`  | `0`            |
| Checkpoint names   | `13px` | `600`  | `0`            |

**Why system font:** A custom typeface gives the editor personality. This editor should have none — it's a lens, not a product. System font = native = invisible.

**Why no smaller than 12px:** Legibility floor. The overlay is compact but never squinting.

## Spacing

`4px` base unit. The overlay is a heads-up display, not a panel.

| Context                  | Value  |
|--------------------------|--------|
| Action bar button padding| `8px`  |
| Action bar gap           | `4px`  |
| Action bar outer padding | `4px`  |
| History entry padding    | `12px 16px` |
| History entry gap        | `0` (separated by borders) |
| Hover glow inset         | `-2px` (extends slightly outside element) |
| Selection ring inset     | `-2px` |
| Drop indicator height    | `2px`  |

## Transitions

Everything fast enough to feel instant, slow enough to not flicker.

| Interaction            | Duration | Easing    |
|------------------------|----------|-----------|
| Hover glow appear/hide | `150ms`  | `ease`    |
| Selection ring appear  | `100ms`  | `ease`    |
| Floating bar enter     | `200ms`  | `ease-out`|
| Floating bar exit      | `150ms`  | `ease-in` |
| History overlay enter  | `250ms`  | `ease-out`|
| History overlay exit   | `200ms`  | `ease-in` |
| Change highlight pulse | `300ms`  | `ease`    |
| Element fade-in (add)  | `300ms`  | `ease-out`|
| Drop indicator appear  | `100ms`  | `ease`    |

## Hover Glow

- `border: 2px solid var(--accent-hover)` positioned absolutely over the element bounds.
- `border-radius: 4px`.
- `pointer-events: none`.
- Appears on `mousemove` hit-test, disappears on leave.
- Extends `2px` outside the element (negative inset) so it doesn't obscure content edges.

## Selection Ring

- `border: 2px solid var(--accent-select)` — same shape as hover but higher opacity.
- Replaces the hover glow (not additive).
- Persists until click-outside deselects.

## Floating Action Bar

- Dark pill: `var(--surface-bar)`, `border-radius: 8px`, tight shadow.
- Positioned via `@floating-ui/react` with `flip` + `shift` to stay in viewport.
- Buttons: icon-only, `28px` square, `border-radius: 6px`.
- Button hover: `rgba(255, 255, 255, 0.10)` background.
- Button active: `rgba(255, 255, 255, 0.15)` background.
- Dividers between button groups: `1px solid rgba(255, 255, 255, 0.10)`.
- Icons: `16px`, `stroke: var(--text-bar)`, `stroke-width: 1.5`.

## History Overlay

- Slides in from right edge, full height, `320px` wide.
- `var(--surface-sheet)` with `backdrop-filter: blur(16px)`.
- Left border: `1px solid var(--border-subtle)`.
- Entries: full-width rows, `border-bottom: 1px solid var(--border-subtle)`.
- Checkpoints: left accent bar `3px solid var(--accent)`, slightly elevated background `rgba(59, 130, 246, 0.04)`.
- Active (current) entry: `background: rgba(59, 130, 246, 0.08)`.
- Close: top-right `x` button or `Escape`.

## Drop Indicators

- Horizontal line: `2px solid var(--drop-indicator)`.
- Small circles at each end: `6px` diameter, same color.
- Appears between siblings during drag.
- `100ms ease` transition.

## Change Highlights

- On MCP update, changed elements get a `var(--accent-pulse)` background that fades over `300ms`.
- Added elements: `opacity: 0 → 1` over `300ms`.
- The highlight is a full-element overlay in the Shadow DOM, not a style change on the content element.

## Anti-Patterns

These violate the visual identity:

- **Color proliferation** — Adding green for success, red for errors, yellow for warnings in the overlay. One accent. Errors use text, not color.
- **Persistent chrome** — Any overlay element that doesn't disappear on deselect/close (except during active drag or text edit).
- **Custom fonts** — Any non-system font in the editor overlay.
- **Heavy shadows** — Shadows deeper than `0 1px 3px`. The editor floats just above the page, not high above it.
- **Background fills on hover** — The hover glow is a border, not a background tint. Background tints obscure content.
- **Opacity below 0.90 on surfaces** — Surfaces must be nearly opaque to remain legible. Translucency is for the history overlay backdrop blur only.
