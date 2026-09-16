# Plan: Contributor-Extensible Supplier Catalogs

**Status**: Proposed
**Goal**: Let a developer add a new supplier's part database (McMaster-Carr, Würth, Misumi,
AliExpress kits, a machine shop's in-house stock list …) by adding **one self-contained
folder plus one registry line**, and have it work correctly everywhere in the app —
part assigner, silhouettes, densities, labels, barcodes, order lists — with automated
feedback if the data is wrong.

This is a **contributor-facing** extension point, not a user-facing feature. Adding a
catalog is a code change + PR, exactly like adding a cabinet type today
(`src/data/cabinetTypes.js`, ADR-007). No runtime catalog upload, no fetch, no backend.

---

## 1. Where we are today

The Bossard catalog is not a plugin — it is welded into the app at six separate layers.

### 1.1 Three hard-coded imports, no registry

```
src/views/drawerMap/dmHelpers.js:1   import bossardDb from '../../data/bossard-db.json'
src/views/drawerMap/dmPanels.js:2    import bossardDb from '../../data/bossard-db.json'
src/views/drawerMap/dmKeybinds.js:2  import bossardDb from '../../data/bossard-db.json'
```

`dbFilter()` (`dmHelpers.js:20`) closes over that single array. There is no seam where a
second dataset could enter. Adding one today means editing three unrelated view files.

### 1.2 Supplier-specific field names are the app's vocabulary

`articleNumber` / `bossardNorm` in the catalog become `bossardPN` / `bossardNorm` on the
part record (`dmHelpers.js:55-56`) and from there spread across the app:

| Location | Usage |
|---|---|
| `doc/CONFIG_SCHEMA.md:75` | `part.bossardPN` is **persisted in user config files** |
| `LabelSheet.js:249` | barcode source |
| `labelSheet/lsSidebar.js:102`, `dmPanels.js:670` | override field labelled `BN (barcode)` |
| `BinLocationPoster.js:182,455` | poster PN column |
| `OrderList.js:79,94,143` | table column + CSV header literal `'Bossard PN,…'` |
| `dmPanels.js:798`, `dmKeybinds.js:361` | **identity lookup** `find(p => p.articleNumber === part.bossardPN)` |

A second supplier has no "BN" and no Bossard article number. Worse, the identity lookup
uses a bare article number as a global key — two suppliers *will* collide on plain
numeric SKUs, and the wrong catalog entry would be silently matched.

### 1.3 Variant classification is keyed on Bossard norm strings

`dmConstants.js:36-53`:

```js
export const VARIANT_DEFS = {
  nut: [{ value: 'nut-square', label: 'Square Nut', norms: ['BN 145', 'BN 3525'] }, …],
  …
}
```

`variantForEntry()` matches `entry.bossardNorm` against those literals. A contributor's
square nuts carry e.g. `"91828A"` instead, so:

- `availableVariants` (`dmPanels.js:853`) filters them out,
- the assigner hits `if (!s.variant) return` and **stops the cascade**,
- the parts are silently unreachable in the UI even though they are in the bundle.

This is the single biggest silent-failure trap for a new catalog.

### 1.4 Silhouette geometry sniffs German catalog prose

`utils/fastenerDims.js`:

```js
washerDims(part)      // switches on part.bossardNorm === 'BN 729' / 'BN 726'
isSquareNut(part)     // part.bossardNorm === 'BN 145' || part.title?.includes('Vierkant')
isMFStandoff(part)    // part.title?.includes('Aussengewinde')
```

`fastenerShapes.js:249` additionally sniffs `description.includes('nyloc') || standard.includes('985')`.

So the rendered drawing depends on German free text and Bossard norm numbers. An
English-language catalog renders large washers as standard washers, square nuts as hex,
M/F standoffs as F/F, and nylocs as plain nuts — all **silently, with no warning**.

### 1.5 Closed vocabularies with zero validation

`headType` must be one of the strings simultaneously known to four places:

| Place | Consequence of an unknown value |
|---|---|
| `dmConstants.js` `TYPE_DEFS` | `typeForHeadType()` → `null`, part never appears in the Type dropdown |
| `dmConstants.js` `HEAD_LABELS` | raw key leaks into UI text |
| `densities.js` `boundingVolMM3()` | falls into `default:` — generic cylinder, wrong order quantities |
| `fastenerShapes.js` `makeTopView`/`makeSideView` | falls back to "generic screw" drawing |

`thread` has the same problem against `fastenerDims.js THREAD_D` (unknown → **silently 3 mm**)
and `densities.js TABLE` keys. A single typo (`"socket-head"`, `"m3"`) produces a catalog
that builds fine, ships fine, and is quietly wrong. Nothing validates any of it —
there is no test runner, no linter, and `.github/workflows/deploy.yml` only builds `main`.

### 1.6 Ingest tooling is Bossard-shaped

`tools/parse_bossard.py` hard-codes `OUT_FILE = src/data/bossard-db.json`, German header
labels (`Kopfform`, `Antrieb`, `Werkstoff`), and PyMuPDF PDF parsing. A contributor with
a CSV export has no documented target format to aim at — the schema exists only as
whatever that script happens to emit.

### 1.7 Bundle budget

`bossard-db.json` is **315 KB / 924 entries**, inlined verbatim into `dist/index.html`
by `vite-plugin-singlefile` (ADR-003 forbids `fetch`). A current `npm run build` produces
**1.20 MB** (304 KB gzipped) — roughly a quarter of it is that one catalog. Ten contributed
catalogs of the same size would push the single-file output past 4 MB. This needs a stated
budget and a build-time check before it becomes a problem, not after.

---

## 2. Target design

### 2.1 One folder per catalog

```
src/data/catalogs/
├── index.js              # THE registry — the only shared file a contributor edits
├── schema.js             # vocabularies + validateCatalog()
├── bossard/
│   ├── meta.js           # identity, labels, barcode format, source & licence
│   └── parts.json        # normalized entries (moved from src/data/bossard-db.json)
└── <new-supplier>/
    ├── meta.js
    └── parts.json
```

`index.js` uses **static** imports only (ADR-003: no dynamic `import()` in prod):

```js
import bossardMeta  from './bossard/meta.js'
import bossardParts from './bossard/parts.json'

export const CATALOGS = {
  bossard: { ...bossardMeta, parts: bossardParts },
}

export const DEFAULT_CATALOG = 'bossard'
export function getCatalog(id) { return CATALOGS[id] ?? CATALOGS[DEFAULT_CATALOG] }
export function allParts() {
  return Object.values(CATALOGS).flatMap(c => c.parts.map(p => ({ ...p, supplier: c.id })))
}
```

Documented in the file header the way `cabinetTypes.js` documents cabinet types —
that file is the house style for this kind of extension point and should be matched.

### 2.2 `meta.js` — per-catalog identity

```js
export default {
  id:          'bossard',            // stable key, stored in configs — never change once merged
  brand:       'Bossard',
  description: 'Bossard AG fastener catalog (BN norms)',
  skuLabel:    'Bossard PN',         // column header in OrderList / poster / label sidebar
  refLabel:    'BN',                 // label for catalogRef
  barcode:     'CODE128',            // or null → suppress barcode for this supplier
  productUrl:  sku => `https://www.bossard.com/…/${sku}`,   // optional, for future QR use
  source:      { retrieved: '2025-03-11', note: 'Parsed from public BN datasheets' },
  licence:     'Factual dimensional data only; no PDFs redistributed.',
}
```

`skuLabel` alone removes the hard-coded string `'Bossard PN'` from `OrderList.js:141` and
the `BN (barcode)` label from two sidebars.

### 2.3 Normalized entry schema (`doc/CATALOG_SCHEMA.md`)

Supplier-neutral, with every discriminator the renderers need stated **explicitly**
instead of inferred from prose:

```json
{
  "sku":         "1386840",
  "catalogRef":  "BN 1052",
  "title":       "Threaded inserts for heat/ultrasonic installation",
  "norms":       ["DIN 912"],

  "partType":    "screw",
  "headType":    "socket",
  "variant":     "washer-large",

  "thread":      "M3",
  "length":      8,
  "drive":       "Hex",
  "material":    "Steel",
  "materialGrade": "8.8",

  "shape": { "nutShape": "square", "locking": "nylon", "standoffEnds": "mf" }
}
```

Changes from today's entries: `articleNumber` → `sku`, `bossardNorm` → `catalogRef`,
plus three new explicit fields — `partType` (was inferred by `typeForHeadType()`),
`variant` (was inferred from BN norms), and `shape` (was sniffed from German titles).
`supplier` is injected by the registry, never stored in the file.

Vocabularies live in `schema.js` as the **single** source of truth, re-exported to
`dmConstants.js`/`densities.js`/`fastenerShapes.js` so the four-way drift in §1.5 becomes
structurally impossible.

### 2.4 Part record written into user configs

`dbEntryToPart()` gains supplier-neutral identity and keeps a legacy alias:

```js
{
  supplier: 'bossard',      // NEW
  sku:      '1386840',      // NEW
  catalogRef: 'BN 1052',    // NEW (replaces bossardNorm)
  bossardPN: '1386840',     // DEPRECATED alias, still written for one release
  …
}
```

Read path everywhere goes through one helper:

```js
// utils/partIdentity.js
export function partIdentity(part) {
  if (part?.sku) return { supplier: part.supplier || DEFAULT_CATALOG, sku: part.sku }
  if (part?.bossardPN) return { supplier: 'bossard', sku: part.bossardPN }   // legacy configs
  return null
}
```

Existing config files keep working untouched, as with legacy `cabinetType` (ADR-007).

---

## 3. Work breakdown

Each phase is independently mergeable and leaves the app working.

### Phase 0 — Guardrails first (no behaviour change)

| # | Task | Files |
|---|---|---|
| 0.1 | Write `doc/CATALOG_SCHEMA.md` — field reference, vocabularies, worked example | new |
| 0.2 | `src/data/catalogs/schema.js` — export `PART_TYPES`, `HEAD_TYPES`, `DRIVES`, `THREADS`, `VARIANTS`, `SHAPE_FLAGS` + `validateCatalog(catalog)` returning structured errors | new |
| 0.3 | `tools/validate-catalogs.mjs` — run the validator over every registered catalog; non-zero exit on error. Checks: required fields; vocabulary membership; `thread` present in `THREAD_D` **and** density table; duplicate `sku` within a catalog; `length` present for length-bearing types; `variant` set where `VARIANT_DEFS` covers that type; warn on entries whose `headType` has no shape renderer | new |
| 0.4 | `npm run validate` + `npm test` wired to it; `tools/check-bundle-size.mjs` fails over a stated `dist/index.html` budget (propose **4 MB**; measured baseline today is 1.20 MB) | `package.json` |
| 0.5 | `.github/workflows/ci.yml` — on `pull_request`: `npm ci && npm run validate && npm run build && npm run check:size` | new |

Phase 0 is what actually makes contribution safe — a contributor gets a red X with a
precise message instead of a silently-wrong silhouette.

### Phase 1 — Registry and de-Bossard-ified assigner

| # | Task | Files |
|---|---|---|
| 1.1 | Move `src/data/bossard-db.json` → `src/data/catalogs/bossard/parts.json`; one-off migration script rewrites `articleNumber`→`sku`, `bossardNorm`→`catalogRef`, and back-fills `partType` / `variant` / `shape` from the existing BN mappings in `dmConstants.js` + `fastenerDims.js` | `tools/migrate-bossard.mjs` (one-shot, then deleted) |
| 1.2 | Add `bossard/meta.js` and `catalogs/index.js` | new |
| 1.3 | `dbFilter()` reads `allParts()`; add a `supplier` filter key; rename `bossardNorms` → `catalogRefs`; add `variants` | `dmHelpers.js` |
| 1.4 | Replace the three `import bossardDb …` with registry lookups; identity lookups become `findBySku(supplier, sku)` | `dmHelpers.js`, `dmPanels.js`, `dmKeybinds.js` |
| 1.5 | `variantForEntry()` reads `entry.variant` directly; `VARIANT_DEFS` loses its `norms` arrays and becomes label metadata only | `dmHelpers.js`, `dmConstants.js` |
| 1.6 | `typeForHeadType()` becomes a fallback — prefer explicit `entry.partType` | `dmHelpers.js` |

### Phase 2 — Supplier-neutral part records

| # | Task | Files |
|---|---|---|
| 2.1 | `utils/partIdentity.js` + `dbEntryToPart()` emits `supplier`/`sku`/`catalogRef` (+ deprecated `bossardPN`) | `dmHelpers.js`, new util |
| 2.2 | Barcode + PN display read `sku` via `partIdentity()`, labelled from `meta.skuLabel`; honour `meta.barcode === null` | `LabelSheet.js`, `lsSidebar.js`, `dmPanels.js`, `BinLocationPoster.js` |
| 2.3 | OrderList: column header and CSV header from `meta.skuLabel`; add a `Supplier` column; **group/split CSV export per supplier** (real-world order lists go to one vendor each) | `OrderList.js` |
| 2.4 | Update `doc/CONFIG_SCHEMA.md` — document `supplier`/`sku`/`catalogRef`, mark `bossardPN` deprecated-but-honoured | `doc/CONFIG_SCHEMA.md` |

### Phase 3 — Remove prose sniffing from geometry

| # | Task | Files |
|---|---|---|
| 3.1 | `washerDims()` switches on `part.variant` (`washer-std`/`washer-large`/`washer-socket`); BN literals kept only as a legacy fallback branch | `fastenerDims.js` |
| 3.2 | `isSquareNut()` → `part.shape?.nutShape === 'square'`; `isMFStandoff()` → `part.shape?.standoffEnds === 'mf'`; both fall back to the current sniffing when `shape` is absent (legacy configs) | `fastenerDims.js` |
| 3.3 | Nyloc detection → `part.shape?.locking === 'nylon'`, same fallback | `fastenerShapes.js` |
| 3.4 | Validator warns when a `washer`/`nut`/`standoff` entry omits the discriminator its renderer needs | `schema.js` |

### Phase 4 — Multi-supplier UX (only once >1 catalog exists)

| # | Task | Files |
|---|---|---|
| 4.1 | Supplier step in the assigner cascade — auto-skipped when only one catalog is registered, so today's flow is unchanged | `dmPanels.js` |
| 4.2 | Preferred-supplier setting persisted in state (`state.preferences.supplier`) to keep dropdowns short | `state.js`, `DataManager.js` |
| 4.3 | Duplicate-length cycling (`dmKeybinds.js:360`) stays within the part's own supplier | `dmKeybinds.js` |

### Phase 5 — Contributor tooling and docs

| # | Task | Files |
|---|---|---|
| 5.1 | `tools/` restructure: `tools/importers/bossard/parse.py` (today's script, output path parameterised) + `tools/importers/TEMPLATE.md` describing the contract: *any* language, *any* source, output must pass `npm run validate` | `tools/` |
| 5.2 | `tools/new-catalog.mjs <id> <Brand>` scaffolds the folder, `meta.js`, an empty `parts.json`, and prints the registry line to paste | new |
| 5.3 | `CONTRIBUTING.md` at repo root: the seven-step add-a-catalog recipe, the "adding a new head type touches 4 files" checklist, licensing rules (no redistributing supplier PDFs — extend the existing `tools/README.md` stance), and the PII/public-repo rules from `CLAUDE.md` | new |
| 5.4 | ADR-010 in `doc/DECISIONS.md`; supersede ADR-006/ADR-008 notes; close **OQ-009** (catalog freshness) with the per-importer answer | `doc/DECISIONS.md` |
| 5.5 | Refresh `doc/ARCHITECTURE.md` dependency graph + `CLAUDE.md` project structure (both are already stale — they predate `views/drawerMap/*`, `StockOrder`, `BinModels`, `DataManager`) | `doc/ARCHITECTURE.md`, `CLAUDE.md` |

---

## 4. Decisions to make before Phase 1

1. **Metric only?** `sortThreads()` (`dmHelpers.js:33`) parses `parseFloat(thread.replace('M','').replace('Ø',''))`
   — imperial threads (`#4-40`, `1/4-20`) sort as `NaN`, and `THREAD_D` + the density table have
   no imperial keys. Recommendation: **declare metric-only for v1**, have the validator reject
   non-metric threads with a clear message, and track imperial as its own follow-up (it needs a
   thread-spec table, not just a catalog).
2. **Bundle budget.** Propose 4 MB for `dist/index.html` (baseline 1.20 MB, i.e. room for
   roughly nine more Bossard-sized catalogs), enforced in CI, with `parts.json`
   minified at build (drop `indent=2`, ~30 % saving) and optional field-stripping if it binds.
   If catalogs ever exceed it, the fix is a build-time opt-in list, not `fetch` (ADR-003 stands).
3. **Do we keep `bossardPN` forever?** Recommendation: write it for one release, read it
   indefinitely, drop writing it after that — same graceful-legacy posture as `cabinetType`.
4. **Non-fastener catalogs?** (o-rings, bearings, electronic components). The schema above is
   fastener-shaped: `thread`/`headType`/`drive`. Recommendation: **out of scope for v1**, but
   `partType` is the seam that would later carry it — a new `partType` brings its own density
   model and shape renderer. Say so explicitly in `CATALOG_SCHEMA.md` so contributors don't
   design around a promise we haven't made.

## 5. Definition of done

A contributor can:

1. run `node tools/new-catalog.mjs wurth Würth`,
2. produce `parts.json` with their own converter,
3. run `npm run validate` and get precise, line-referenced errors,
4. paste one line into `catalogs/index.js`,
5. open a PR where CI validates the data, builds, and checks bundle size,

and their parts then appear in the assigner cascade, get correct silhouettes, correct
density-based order quantities, correctly labelled barcodes, and their own CSV order
list — **without touching a single view file**.
