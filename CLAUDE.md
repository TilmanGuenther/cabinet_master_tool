# Cabinet Planner — CLAUDE.md

## Project Overview
Hardware cabinet planning tool for drawer cabinets (LISTA and others) with Gridfinity bins.
Single-page web app, no backend, runs from `file://` after build.

## Quick Reference

### Commands

> **All commands must be run from `cabinet-planner/`, not the repo root.**

```bash
# First-time setup (run once after cloning)
cd cabinet-planner
npm install

# Development
npm run dev          # Vite dev server with HMR at http://localhost:5173

# Production build
npm run build        # produces dist/index.html (single self-contained file)
```

### Tech Stack
- Vanilla JS (ES modules, no framework)
- Vite + vite-plugin-singlefile
- qrcode npm package for QR generation
- jsbarcode npm package for CODE128 barcodes
- State persisted to localStorage (auto-save) and exported as JSON

### Project Structure
```
cabinet-planner/
├── index.html              # app shell
├── vite.config.js
├── package.json
├── src/
│   ├── main.js             # entry: tab navigation, view routing, theme management
│   ├── state.js            # reactive state manager + localStorage auto-save + named snapshots
│   ├── style.css           # all styles including @media print and CSS theme variables
│   ├── data/
│   │   ├── bossard.js      # legacy fastener catalog (reference data, not imported by views)
│   │   ├── bossard-db.json # parsed Bossard catalog used by DrawerMap part assigner
│   │   ├── densities.js    # bulk density lookup + fallback estimator
│   │   └── sampleConfig.js # default config for first-time use
│   ├── views/
│   │   ├── Setup.js           # config import/export, cabinet + drawer CRUD, named saves
│   │   ├── DrawerMap.js       # interactive 3-panel bin editor (drag-to-create, drag-to-move)
│   │   ├── LabelSheet.js      # Avery-style labels with QR codes and barcodes
│   │   ├── OrderList.js       # quantity calculator + CSV export
│   │   ├── BinLocationPoster.js # full-scale 1:1 SVG printable drawer map
│   │   └── Help.js            # help modal with keyboard shortcuts and reference tabs
│   └── utils/
│       ├── fastenerSvg.js  # B&W SVG silhouette icons for all fastener types
│       ├── volume.js       # bin volume + fill calculations
│       └── print.js        # print mode helpers
├── doc/
│   ├── ARCHITECTURE.md     # detailed architecture and data flow
│   ├── CONFIG_SCHEMA.md    # JSON config schema reference
│   ├── DECISIONS.md        # architectural decisions log
│   └── PHYSICAL_REFERENCE.md # LISTA/Gridfinity dimensions
└── tools/
    ├── parse_bossard.py    # Python script to extract catalog data from PDFs
    ├── requirements.txt
    └── pdfs/               # Bossard PDF datasheets (source for bossard-db.json)
```

### Key Architecture Patterns
- **State management**: `src/state.js` — simple pub/sub. `getState()`, `setState()`, `updateState()`, `subscribe()`. Auto-saves to localStorage on every change; also supports named snapshots (`createSave`, `loadSave`, `deleteSave`, `getSaves`).
- **Views**: Each view exports a `renderXxx(container, state)` function. Views are stateless renderers — they receive state and build DOM.
- **Navigation**: Tab-based in `main.js` (Setup, Drawer Map, Labels, Order List, Bin Poster). Views can trigger navigation via `document.dispatchEvent(new CustomEvent('navigate', { detail: 'key' }))`.
- **Theme**: Light/dark mode managed in `main.js`, persisted to localStorage, with system preference fallback. CSS custom properties (variables) drive all theme colors.
- **Config JSON is source of truth**: The app is a viewer/generator. The JSON file defines what's in the cabinet. localStorage auto-save is a convenience layer on top.

### Physical Constants (do not change casually)
- Gridfinity base unit: 42mm × 42mm
- Height unit: 7mm
- Wall thickness factor: 0.85 (15% volume reduction)
- Cabinet-specific constants (drawer heights, height margin, default dimensions) live in `src/data/cabinetTypes.js`
- To add a new cabinet brand: add one entry to `CABINET_TYPES` in `cabinetTypes.js` — see the inline documentation there

### Thread Color Convention
- M2 = blue, M2.5 = green, M3 = yellow, M4 = red

### When Editing
- All view files follow the same pattern: `export function renderXxx(container, state)`
- The `esc()` helper in each view is for HTML escaping — use it for any user-supplied text
- Density lookup: `getDensity(thread, headType, length)` in `densities.js` — has automatic fallback
- Bossard catalog is reference-only; the config JSON defines actual bin contents
- `bossard-db.json` is the parsed catalog used by the DrawerMap part assigner. Re-generate with `tools/parse_bossard.py` if PDFs change
- Fastener SVG icons: `utils/fastenerSvg.js` — exports `makeFastenerSVGEl(part, opts)` used by LabelSheet and DrawerMap
- Print CSS is in `style.css` under `@media print` — views add `no-print` class to hide UI controls. Three print targets: label sheet, drawer map (BinLocationPoster), and single-drawer print

### Conventions
- No TypeScript, no JSX, no build-time type checking
- Prefer small, focused functions
- Each file should be readable in isolation
- No external CSS frameworks
- Keep the `dist/index.html` output working from `file://` — no fetch(), no dynamic imports in prod

### Privacy — This is a public repository
- Do not include real names, email addresses, or other PII in any file, comment, or commit message
- Use the GitHub noreply address for commits: `54677116+TilmanGuenther@users.noreply.github.com`
- Do not hardcode internal hostnames, IP addresses, or private URLs in source files
- Do not add API keys, tokens, passwords, or credentials anywhere in the repo
- Sample/default config data (`sampleConfig.js`) must use generic placeholder values, not real inventory data
