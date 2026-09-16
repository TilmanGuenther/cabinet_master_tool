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

# Checks (all of these run in CI)
npm test             # lint + catalog validation + golden snapshots
npm run lint         # eslint; narrow on purpose, no-undef is the point
npm run validate     # catalogs against src/data/catalogs/schema.js
npm run test:golden  # snapshots of every description, density, silhouette, cascade state
npm run test:golden:update   # accept a deliberate output change, then READ THE DIFF
npm run check:size   # dist/index.html against the 4 MB budget
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
├── eslint.config.js        # narrow: no-undef and no-unused-vars, not style
├── package.json
├── src/
│   ├── main.js             # entry: tab navigation, view routing, theme management
│   ├── state.js            # reactive state + localStorage auto-save + named snapshots
│   ├── styles/             # tokens, base, views, drawMap, labelSheet, print
│   ├── data/
│   │   ├── catalogs/       # WHO SELLS A PART (extension point)
│   │   │   ├── index.js    #   registry, allParts(), findBySku()
│   │   │   ├── schema.js   #   vocabularies + validateCatalog()
│   │   │   └── bossard/    #   meta.js + parts.json
│   │   ├── partTypes/      # WHAT A PART IS (extension point)
│   │   │   ├── index.js    #   registry, resolvePartType, describePart, svg dispatch
│   │   │   ├── _fields.js  #   dimension fields and cascade behaviour
│   │   │   ├── _shared.js  #   volume-model helpers
│   │   │   └── *.js        #   screw, nut, washer, standoff, setScrew, insert, pin,
│   │   │                   #   pressNut, oring, spring, spacer
│   │   ├── bossard.js      # legacy standalone reference, not imported by views
│   │   ├── cabinetTypes.js # per-brand cabinet constants (extension point)
│   │   ├── densities.js    # empirical density table; geometry lives in partTypes
│   │   └── sampleConfig.js # default config for first-time use
│   ├── views/
│   │   ├── Home.js  Setup.js  DrawerMap.js  LabelSheet.js  OrderList.js
│   │   ├── BinLocationPoster.js  DataManager.js  StockOrder.js  BinModels.js  Help.js
│   │   ├── drawerMap/      # dmCascade (assigner engine), dmPanels, dmHelpers,
│   │   │                   # dmState, dmKeybinds, dmConstants
│   │   └── labelSheet/     # lsHelpers, lsSidebar
│   └── utils/
│       ├── partIdentity.js # (supplier, sku) identity, with a legacy read path
│       ├── partDims.js     # proportions + shape discriminators
│       ├── partShapes.js   # SVG shape primitives (toolkit, not dispatcher)
│       ├── partSvg.js      # canvases + break overlay
│       ├── binHistory.js  volume.js  print.js
├── doc/
│   ├── ARCHITECTURE.md  CONFIG_SCHEMA.md  DECISIONS.md  PHYSICAL_REFERENCE.md
│   ├── CATALOG_SCHEMA.md      # contributor reference for catalog entries
│   └── CATALOG_PLUGIN_PLAN.md # the plan these extension points came from
├── test/                   # node:test; golden + cascade snapshots
└── tools/
    ├── validate-catalogs.mjs  check:size  new-catalog.mjs  new-part-type.mjs
    └── importers/bossard/     # parse.py + pdfs/ (PDFs not committed)
```
### Key Architecture Patterns
- **State management**: `src/state.js` — simple pub/sub. `getState()`, `setState()`, `updateState()`, `subscribe()`. Auto-saves to localStorage on every change; also supports named snapshots (`createSave`, `loadSave`, `deleteSave`, `getSaves`).
- **Views**: Each view exports a `renderXxx(container, state)` function. Views are stateless renderers — they receive state and build DOM.
- **Navigation**: Tab-based in `main.js` (Setup, Drawer Map, Labels, Order List, Bin Poster). Views can trigger navigation via `document.dispatchEvent(new CustomEvent('navigate', { detail: 'key' }))`.
- **Theme**: Light/dark mode managed in `main.js`, persisted to localStorage, with system preference fallback. CSS custom properties (variables) drive all theme colors.
- **Config JSON is source of truth**: The app is a viewer/generator. The JSON file defines what's in the cabinet. localStorage auto-save is a convenience layer on top.
- **Two extension points** (see `CONTRIBUTING.md`): a **catalog** (`data/catalogs/`) is a supplier's parts; a **part type** (`data/partTypes/`) is a kind of part. Adding either should never require touching a view, a renderer or the query layer.

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
- Density: `getDensity(part)` in `densities.js` dispatches to the part type's `volumeMM3`
- Part identity is the `(supplier, sku)` pair via `utils/partIdentity.js` — never a bare
  article number, which two suppliers can collide on. `bossardPN` is a deprecated alias,
  still read so older configs keep working
- Catalogs state `partType`, `variant` and `shape` explicitly. Do not reintroduce guessing
  them from title text — that silently mis-drew any non-German catalog and took a phase to
  remove
- Part silhouettes: each type's `svg` descriptor in `data/partTypes/`, composed from the
  primitives in `utils/partShapes.js`. A type may omit `svg`; labels fall back to text
- Print CSS is in `styles/print.css` — views add `no-print` to hide UI controls. Three
  print targets: label sheet, bin poster, single-drawer print
- **`npm test` before and after any change.** A refactor meant to change nothing must leave
  `test/*.snapshot.json` byte-identical; a deliberate change is accepted with
  `npm run test:golden:update` and the diff is the review artefact

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
