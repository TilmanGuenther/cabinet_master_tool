# Architectural Decisions Log

## ADR-001: Vanilla JS, no framework
**Status**: Decided
**Context**: The app is a small, single-purpose tool with ~4 views. No real-time collaboration.
**Decision**: Vanilla ES modules with imperative DOM manipulation.
**Consequences**: Simple build, no framework churn, easy to understand. Trade-off: no virtual DOM diffing — full re-render on state change (acceptable for this data size).

## ADR-002: JSON config as source of truth
**Status**: Decided
**Context**: No server, no database. Need persistence across sessions.
**Decision**: All cabinet state lives in a JSON file. Import/export via file picker and Blob download.
**Consequences**: Users manage their own files. No sync, no auth, no data loss from browser clearing. The app is a pure viewer/generator.

## ADR-003: Single-file build output
**Status**: Decided
**Context**: Must work offline from `file://` with no server.
**Decision**: Use `vite-plugin-singlefile` to inline everything into one HTML file.
**Consequences**: The QR code library and all CSS get bundled. Larger HTML file but fully portable.

## ADR-004: Full re-render on state change
**Status**: Decided
**Context**: With ~100-200 bins max and 4 simple views, DOM performance is not a concern.
**Decision**: On any state change, wipe `#view-container` and re-render the current view.
**Consequences**: Simple mental model. No stale state bugs. If performance ever matters, can add targeted updates per view.

## ADR-005: Separate state.js module
**Status**: Decided
**Context**: Multiple views need to read and write state. Need a single source of truth in-memory.
**Decision**: Minimal pub/sub store in `state.js` with `getState`, `setState`, `updateState`, `subscribe`.
**Consequences**: Views import state operations directly. No dependency injection, no context passing.

## ADR-006: Bossard catalog as reference data only
**Status**: Decided
**Context**: The catalog (`bossard.js`) is a convenience for populating configs, not a runtime dependency.
**Decision**: Views do not import the catalog. Config JSON is self-contained.
**Consequences**: Users can have parts not in the catalog. Catalog can be extended without affecting existing configs.

## ADR-007: localStorage auto-save layer
**Status**: Decided
**Context**: JSON import/export works but users lose work if they close the tab before exporting.
**Decision**: Auto-save the full state to `localStorage['cabinet_planner_state']` on every `updateState` call. Also provide named snapshots (`cabinet_planner_saves`) for deliberate checkpoints. The JSON export/import flow remains the primary backup mechanism.
**Consequences**: Work survives browser crashes and refreshes without any user action. Named saves give users lightweight versioning without a server.

## ADR-008: Parsed Bossard catalog
**Superseded by ADR-010.**
**Status**: Decided
**Context**: `bossard.js` was a hand-maintained reference file. DrawerMap needed a structured, queryable catalog to power the cascading part assigner.
**Decision**: Add a Python tool (`tools/parse_bossard.py`) to extract data from Bossard PDF spec sheets and emit `data/bossard-db.json`. The JSON is committed alongside the source PDFs.
**Consequences**: Catalog updates require running the Python script and committing the new JSON. The JSON is inlined at build time (no fetch). The catalog is still reference-only — the config JSON is the source of truth.

## ADR-009: Bin Location Poster as separate view
**Status**: Decided
**Context**: Users need a physical reference card they can attach to each drawer showing where each part lives.
**Decision**: Add `BinLocationPoster.js` as a fifth main view. It renders a full-scale 1:1 SVG (mm = pixel) of the drawer interior with bin outlines, column/row labels, and part text. Print at 100% scale with a custom `@page` rule.
**Consequences**: Provides a physical fallback for navigating the cabinet without a screen. The SVG approach avoids canvas resolution issues at physical print sizes.
## ADR-007: Expandable cabinet type system
**Status**: Decided
**Context**: The tool was originally hard-coded for LISTA cabinets. Different brands have different drawer front-panel heights and different height margins (the gap between front-panel height and usable interior depth).
**Decision**: All per-brand physical constants live in `src/data/cabinetTypes.js` as a plain JS object keyed by a stable id string. The cabinet type id is saved in the config JSON as `cabinet.cabinetType`. Adding a new brand is a single-file, self-contained change with no schema migration required.
**Consequences**: Legacy configs without `cabinetType` fall back to `lista_75` transparently. The height selector and drawer creation logic are now driven by the type spec rather than global constants. Contributors can add a brand by editing one file.

## ADR-010: Catalogs as a registry of supplier directories
**Status**: Decided
**Context**: The Bossard catalog was imported directly by three view files under a
supplier-specific schema (`articleNumber`, `bossardNorm`). A second supplier had nowhere
to go, and bare article numbers were being used as global identity, which two suppliers
can collide on.
**Decision**: One directory per catalog under `src/data/catalogs/<id>/` holding `meta.js`
and `parts.json`, registered in `index.js`. Entries use a supplier-neutral schema
(`sku`, `catalogRef`) and state `partType`, `variant` and `shape` explicitly instead of
leaving them to be inferred at runtime. `findBySku(supplier, sku)` is the identity lookup.
**Consequences**: Adding a supplier is a directory plus one registry line, with no view
file touched. Imports stay static because the single-file build cannot fetch (ADR-003),
so every catalog is inlined — hence the bundle budget checked in CI.

## ADR-011: Part types as modules
**Status**: Decided
**Context**: What a part *is* was spread across four files that had to agree by hand:
type definitions and head labels in the drawer map, a volume switch in `densities.js`,
two description builders, and four separate per-head silhouette dispatches. Nothing
non-fastener could be expressed, since `headType` was the de-facto primary key.
**Decision**: One module per part type in `src/data/partTypes/`, owning its head
geometries, labels, description, packed-volume model, silhouette and assigner cascade.
`partType` is stored on the part record rather than inferred.
**Consequences**: Adding a part type — including one with entirely different dimensions,
like an o-ring — is one module plus a registry line. A type may omit `svg` and its labels
fall back to text. Legacy configs without `partType` still resolve via `headType`.

---

## Open Questions

### OQ-001: Config validation on import
**Status**: Open
**Question**: Should the app validate the JSON schema on import and warn about issues (overlapping bins, missing fields)?
**Notes**: Currently just checks for `cabinet` key. Could add more validation later.

### OQ-002: Drag-and-drop bin placement
**Status**: Resolved
**Question**: Should a future version allow visual bin placement in the Drawer Map view?
**Notes**: Implemented — DrawerMap supports drag-to-create new bins and drag-to-move existing bins on the grid. Setup view supports drag-to-reorder drawers within a cabinet.

### OQ-003: Multiple cabinet support
**Status**: Resolved
**Question**: Should the config support multiple cabinets?
**Notes**: Implemented — the config schema uses a `cabinets` array. The Setup view supports adding, renaming, and deleting multiple cabinets.

### OQ-004: Bossard PN lookup / catalog browser
**Status**: Resolved
**Question**: Should there be a UI to browse the catalog and auto-populate bin parts?
**Notes**: Implemented — DrawerMap's right panel includes a cascading part assigner (Type → Variant → Thread → Head → Drive → Length) backed by the catalog registry (900+ parts parsed from PDFs). Selecting a part auto-fills description, standard, and Bossard PN.

### OQ-005: Undo/redo for config edits
**Status**: Deferred
**Question**: Worth adding undo/redo to the state manager?
**Notes**: Simple to implement (state history stack) but low priority since edits are minimal. Named saves in the Setup view provide a manual checkpoint mechanism.

### OQ-006: Dark mode
**Status**: Resolved
**Question**: Should the app support dark mode?
**Notes**: Implemented — full light/dark theme toggle in the nav bar, persisted to localStorage, with system `prefers-color-scheme` fallback. CSS custom properties drive all theme colors.

### OQ-007: Config validation on import (detailed)
**Status**: Open
**Question**: Should import warn about overlapping bins, out-of-bounds positions, or unknown fields?
**Notes**: Currently only checks for the presence of the `cabinets` key. A validation pass could catch common hand-editing mistakes without blocking import.

### OQ-008: Label sheet preset configurability
**Status**: Open
**Question**: Should users be able to define custom label sheet dimensions beyond the 4 built-in page sizes?
**Notes**: Currently supports A4, A5, Letter, Legal with the Avery L7160 layout. Users with different label stock have to hand-edit the JSON config.

### OQ-009: Catalog freshness / update workflow
**Status**: Resolved
**Question**: Is the current PDF → Python → JSON workflow sustainable for catalog updates?
**Notes**: Each catalog owns its importer and documents its own provenance in `meta.js` (`source.retrieved`, `source.note`). `tools/parse_bossard.py` regenerates the Bossard catalog directly in the normalized schema; any other supplier brings its own converter, and the only contract is that the output passes `npm run validate`, which CI runs on every pull request. Freshness stays a manual, per-catalog decision — deliberately, since the source PDFs cannot be redistributed.
