# Architecture

## Overview

Cabinet Planner is a single-page vanilla JS app built with Vite. It has **no backend** — all state lives in an exported/imported JSON config file and is also persisted automatically to browser localStorage. The built output is a single `dist/index.html` that works from `file://`.

## Data Flow

```
JSON Config File
    ↓ (import via <input type="file">)
state.js (in-memory + localStorage auto-save)
    ↓ (subscribe/notify)
Views (Setup, DrawerMap, LabelSheet, OrderList, BinLocationPoster)
    ↓ (export)
JSON download / CSV download / Print / SVG
```

## Module Dependency Graph

```
main.js
├── state.js ← data/sampleConfig.js
├── views/Setup.js            ← state.js
├── views/DrawerMap.js        ← state.js, drawerMap/*, data/partTypes/, data/catalogs/
├── views/LabelSheet.js       ← state.js, utils/partSvg.js, utils/partIdentity.js, qrcode, jsbarcode
├── views/OrderList.js        ← state.js, utils/volume.js, data/densities.js, utils/partIdentity.js
├── views/BinLocationPoster.js ← state.js, utils/print.js, utils/partIdentity.js
├── views/DataManager.js      ← state.js, data/catalogs/
├── views/Help.js             (standalone)
│
├── data/catalogs/            WHO SELLS A PART
│   ├── index.js              registry, allParts(), findBySku()
│   ├── schema.js             vocabularies + validateCatalog()
│   └── <supplier>/           meta.js + parts.json
│
├── data/partTypes/           WHAT A PART IS
│   ├── index.js              registry, resolvePartType(), describePart(), svg dispatch
│   ├── _fields.js            dimension fields and how each behaves in the cascade
│   ├── _shared.js            helpers for volume models
│   └── <type>.js             one module per part type
│
├── data/densities.js         empirical table; geometry lives in partTypes
└── utils/
    ├── partIdentity.js       (supplier, sku) identity, with a legacy read path
    ├── partDims.js           proportions and shape discriminators
    ├── partShapes.js         SVG shape primitives (a toolkit, not a dispatcher)
    └── partSvg.js            canvases and the break overlay
```

## Extension Points

Two, independent of each other, both documented in `CONTRIBUTING.md`:

- **Catalogs** (`data/catalogs/`) — a supplier's parts. One directory plus one
  registry line. Entries use a supplier-neutral schema and state `partType`,
  `variant` and `shape` explicitly rather than leaving them to be inferred.
- **Part types** (`data/partTypes/`) — a kind of part. One module declaring its
  geometries, assigner cascade, description, packed-volume model and (optionally)
  its drawing. `o-ring` is the worked example of one with no thread, no head and
  no length.

Neither requires touching a view, a renderer or the query layer. `npm run validate`
checks catalogs against the schema; the golden snapshots check that adding either
changes nothing that already existed.

## State Management

`state.js` provides a minimal pub/sub store with localStorage persistence:

- `getState()` — returns current config object
- `setState(obj)` — replaces entire state (used on import)
- `updateState(fn)` — mutates state in place (used for edits)
- `subscribe(fn)` — register a listener; returns unsubscribe function

**Auto-save**: every state change is written to `localStorage['cabinet_planner_state']` so work survives browser crashes and refreshes.

**Named snapshots**: the state module also manages named saves (separate from the main auto-save slot):
- `createSave(name)` — deep-clone current state with timestamp → `localStorage['cabinet_planner_saves']`
- `loadSave(id)` — restore a snapshot
- `deleteSave(id)` — remove a snapshot
- `getSaves()` — list all snapshots sorted newest-first
- `isStorageAvailable()` — detects unavailable storage (private browsing, quota exceeded)

On any state change, `main.js` re-renders the active view from scratch (full DOM replacement). This is intentionally simple — with the small data sizes involved, there is no need for virtual DOM or diffing.

## View Contract

Every view module exports a single render function:

```js
export function renderViewName(container, state) { ... }
```

- `container`: empty DOM element to render into
- `state`: current config object (read-only convention)
- Views build DOM imperatively and attach event listeners
- Views that modify state import `setState`/`updateState` from `state.js`

## Navigation

Tab-based navigation lives in `main.js`. Five main tabs: Setup, Drawer Map, Labels, Order List, Bin Poster. A Help button opens a modal separately.

Views can trigger navigation to another tab by dispatching a custom DOM event:

```js
document.dispatchEvent(new CustomEvent('navigate', { detail: 'map' }))
```

`main.js` listens for this event and calls `switchView(key)`.

## Theme Management

Light/dark mode is managed in `main.js`:
- Toggle persisted to `localStorage['cabinet_planner_theme']`
- Falls back to `prefers-color-scheme` system preference on first load
- CSS custom properties (variables) on `:root` drive all colors — no class swapping needed beyond `data-theme` on `<html>`

## State Schema

The top-level state object is:

```json
{
  "cabinets": [
    {
      "id": "cabinet-1",
      "name": "...",
      "innerWidthMM": 565,
      "innerDepthMM": 574,
      "totalFrontHeightMM": 1200,
      "gridW": 13,
      "gridH": 13,
      "labelSheet": { ... },
      "drawers": [ ... ]
    }
  ]
}
```

See `doc/CONFIG_SCHEMA.md` for the full field reference.

## Build Pipeline

1. `npm run dev` — Vite dev server with HMR
2. `npm run build` — Vite bundles everything, then `vite-plugin-singlefile` inlines all JS/CSS/assets into a single `dist/index.html`
3. The output works from `file://` with no server — no dynamic imports, no fetch() in production code

## Print Architecture

Three print targets exist:

1. **Label Sheet** (`LabelSheet.js`) — Avery-style label grid, configurable page size
2. **Bin Location Poster** (`BinLocationPoster.js`) — full-scale 1:1 SVG of a drawer interior; prints at actual physical size
3. **Single-drawer map** — condensed drawer grid, one per page

All use `@media print` CSS in `style.css`. The `no-print` class hides UI controls (nav, buttons). `utils/print.js` injects a `@page` CSS rule and opens the print dialog; it sets `data-print-mode` on the body for mode-specific print styles.

## Fastener SVG Rendering

`utils/fastenerSvg.js` generates black-and-white SVG silhouettes for all supported fastener types (screws, nuts, washers, standoffs, set screws, inserts, pins). Each SVG shows a top/drive view and a proportional side profile. Used by both LabelSheet and DrawerMap's bin property panel.

## Offline / file:// Constraints

The built app must work offline from `file://`. This means:
- No `fetch()` calls (no loading JSON from URLs)
- No dynamic `import()` in production
- All assets inlined by vite-plugin-singlefile
- QR codes generated client-side via the `qrcode` library (canvas-based)
- Barcodes generated client-side via the `jsbarcode` library
