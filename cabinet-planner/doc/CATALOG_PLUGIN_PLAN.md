# Plan: Contributor-Extensible Part Catalogs

**Status**: Proposed — scope decisions settled (§4)
**Goal**: Let a developer add a new supplier's part database (McMaster-Carr, Würth, Misumi,
a machine shop's in-house stock list …) **and new kinds of part** (springs, o-rings,
spacers, bearings …) by adding self-contained modules plus a registry line, and have it
work correctly everywhere — part assigner, silhouettes, densities, labels, barcodes,
order lists — with automated feedback when the data is wrong.

This is a **contributor-facing** extension point, not a user-facing feature. Adding a
catalog or a part type is a code change + PR, exactly like adding a cabinet type today
(`src/data/cabinetTypes.js`, ADR-007). No runtime upload, no fetch, no backend.

There are **two** extension points, and they are independent:

| Extension point | Answers | Added by |
|---|---|---|
| **Catalog** | *who sells it* — SKUs, norms, prices, barcodes | `src/data/catalogs/<id>/` |
| **Part type** | *what it is* — dimensions, description, density model, silhouette | `src/data/partTypes/<id>.js` |

A contributor adding Würth screws needs only the first. A contributor adding o-rings needs
both. Today **neither exists**.

---

## 1. Where we are today

### 1.1 Three hard-coded imports, no catalog registry

```
src/views/drawerMap/dmHelpers.js:1   import bossardDb from '../../data/bossard-db.json'
src/views/drawerMap/dmPanels.js:2    import bossardDb from '../../data/bossard-db.json'
src/views/drawerMap/dmKeybinds.js:2  import bossardDb from '../../data/bossard-db.json'
```

`dbFilter()` (`dmHelpers.js:20`) closes over that single array. There is no seam where a
second dataset could enter.

### 1.2 Supplier-specific field names are the app's vocabulary

`articleNumber` / `bossardNorm` become `bossardPN` / `bossardNorm` on the part record
(`dmHelpers.js:55-56`) and spread from there:

| Location | Usage |
|---|---|
| `doc/CONFIG_SCHEMA.md:75` | `part.bossardPN` is **persisted in user config files** |
| `LabelSheet.js:249` | barcode source |
| `lsSidebar.js:102`, `dmPanels.js:670` | override field labelled `BN (barcode)` |
| `BinLocationPoster.js:181,454` | poster PN line |
| `OrderList.js:79,94,143` | table column + CSV header literal `'Bossard PN,…'` |
| `dmPanels.js:798`, `dmKeybinds.js:361` | **identity lookup** `find(p => p.articleNumber === part.bossardPN)` |

The identity lookup uses a bare article number as a global key — two suppliers *will*
collide on plain numeric SKUs, and the wrong entry would be silently matched.

### 1.3 Variant classification is keyed on Bossard norm strings

`dmConstants.js:36-53`:

```js
export const VARIANT_DEFS = {
  nut: [{ value: 'nut-square', label: 'Square Nut', norms: ['BN 145', 'BN 3525'] }, …],
  …
}
```

`variantForEntry()` matches `entry.bossardNorm` against those literals. A contributor's
square nuts carry e.g. `"91828A"`, so `availableVariants` (`dmPanels.js:853`) filters them
out, the assigner hits `if (!s.variant) return`, and the parts become **unreachable in the
UI despite being in the bundle**.

### 1.4 Silhouette geometry sniffs German catalog prose

`utils/fastenerDims.js`:

```js
washerDims(part)      // switches on part.bossardNorm === 'BN 729' / 'BN 726'
isSquareNut(part)     // part.bossardNorm === 'BN 145' || part.title?.includes('Vierkant')
isMFStandoff(part)    // part.title?.includes('Aussengewinde')
```

plus `fastenerShapes.js:249` and `lsHelpers.js:50` independently sniffing
`description.includes('nyloc') || standard.includes('985')`.

An English-language catalog renders large washers as standard, square nuts as hex, M/F
standoffs as F/F and nylocs as plain nuts — silently.

### 1.5 Closed vocabularies with zero validation

`headType` must be one of the strings simultaneously known to four places:

| Place | Consequence of an unknown value |
|---|---|
| `dmConstants.js` `TYPE_DEFS` | `typeForHeadType()` → `null`, part never appears in the Type dropdown |
| `dmConstants.js` `HEAD_LABELS` | raw key leaks into UI text |
| `densities.js` `boundingVolMM3()` | falls into `default:` — generic cylinder, wrong order quantities |
| `fastenerShapes.js` dispatch | falls back to "generic screw" drawing |

`thread` has the same problem against `fastenerDims.js THREAD_D` (unknown → **silently
3 mm**). There is no test runner, no linter, and `.github/workflows/deploy.yml` only
builds `main` — a catalog PR gets no automated signal at all.

### 1.6 Ingest tooling is Bossard-shaped

`tools/parse_bossard.py` hard-codes `OUT_FILE`, German header labels (`Kopfform`,
`Antrieb`, `Werkstoff`) and PyMuPDF PDF parsing. The entry schema exists only as
"whatever that script happens to emit" — there is nothing for a contributor with a CSV
to aim at.

### 1.7 Bundle budget

`bossard-db.json` is 315 KB / 924 entries, inlined verbatim by `vite-plugin-singlefile`
(ADR-003 forbids `fetch`). A current `npm run build` produces **1.20 MB** (304 KB
gzipped), roughly a quarter of it that one catalog.

### 1.8 The part model is fastener-shaped — the blocker for non-fastener parts

This is the largest piece of work and it is **structural**, not cosmetic. `headType` is
the de-facto primary key of the entire part model; `partType` is *derived from it*
(`typeForHeadType()`), never stored. A spring or an o-ring has no head, no thread and no
drive, so it falls through every one of these:

| Layer | Fastener assumption | What an o-ring does today |
|---|---|---|
| `dmConstants.js TYPE_DEFS` | types are defined *as sets of `headTypes`* | cannot be expressed at all |
| `dmPanels.js:836-1010` | cascade hard-coded Type→Variant→Thread→Head→Drive→Length, each step an `if (!s.x) return` | cascade dead-ends at Thread |
| `dbFilter()` | fixed keys `{headTypes, thread, head, drive, length}` | no axis for ID × cross-section |
| `densities.js getDensity(thread, headType, length)` | signature *is* the fastener model | `OrderList.js:72` passes `part.thread \|\| 'M3'`, `part.headType \|\| 'socket'` — **an o-ring is silently priced as an M3 socket screw** |
| `fastenerDims.js d(thread)` | `THREAD_D` lookup, M2–M10 | unknown → silently 3 mm |
| `fastenerSvg.js computeMmPerUnit` + `fastenerShapes.js` dispatch | `switch (headType)` | falls back to "generic screw" drawing |
| `LabelSheet.js:302` | `if (part.headType && !disableImage)` gates the whole icon block; `(ht === 'nut' \|\| ht === 'washer')` hard-codes top-vs-side layout | no image, ever |
| **Three** description builders — `dmHelpers.js buildPartDescription()`, `lsHelpers.js formatDesc()`, and `BinLocationPoster.js` inline (twice, lines 177 and 450) | each independently switches on `thread`/`headType`/`length` | all three emit empty or nonsense text |

So supporting springs and o-rings is not "add a few enum values" — it requires promoting
`partType` to a first-class registry that **owns** its dimensions, description, density
model and silhouette, and making the assigner cascade data-driven. That is Phases 1–2
below, and it is worth doing regardless: it also collapses the four-way `headType` drift
in §1.5 and the three duplicate description builders.

---

## 2. Target design

### 2.1 Part type modules — `src/data/partTypes/`

One module per kind of part. It is the single place that knows how that part behaves.

```
src/data/partTypes/
├── index.js        # registry: PART_TYPES, getPartType(), resolvePartType(part)
├── _fields.js      # shared dimension-field defs (thread, length, drive, outerD, …)
├── screw.js  nut.js  washer.js  standoff.js  setScrew.js  insert.js  pin.js  pressNut.js
└── oring.js  spring.js  spacer.js            # ← new in Phase 6
```

```js
// src/data/partTypes/oring.js
export default {
  id:    'o-ring',
  label: 'O-Ring',

  // Assigner cascade, in order. Each name is a flat field on the catalog entry.
  cascade: ['variant', 'innerD', 'crossSection'],

  fields: {
    innerD:       { label: 'Inner Ø',     unit: 'mm', sort: 'numeric' },
    crossSection: { label: 'Cross-section',    unit: 'mm', sort: 'numeric' },
  },

  variants: [
    { value: 'oring-nbr70', label: 'NBR 70 Shore A' },
    { value: 'oring-fkm',   label: 'FKM (Viton)' },
  ],

  // The ONE description builder for this type (replaces three switch statements)
  describe: e => [`Ø${e.innerD}×${e.crossSection}`, e.material].filter(Boolean).join(' '),

  // Effective packed volume per piece, mm³ → pieces/ml. Torus + tangle penalty.
  volumeMM3: e => {
    const R = (e.innerD + e.crossSection) / 2, r = e.crossSection / 2
    return 2 * Math.PI ** 2 * R * r ** 2 * 3.0
  },

  // null → no silhouette; labels omit the image block cleanly
  svg: { top: topORing, side: sideORing, layout: 'top-first' },
}
```

Existing fastener types wrap the code already in `densities.js` / `fastenerShapes.js` —
Phase 1 is a pure move, not a rewrite.

**Dimension fields stay flat and top-level** on the entry (`thread`, `length`, `innerD`,
`wireD` …) rather than moving into a nested `dims` bag. The *set* of fields is declared
per type, but the storage shape is unchanged — so existing data, `fastenerSvg.js` and
`CONFIG_SCHEMA.md` need no migration, and configs stay readable when hand-edited.

### 2.2 Catalogs — `src/data/catalogs/`

```
src/data/catalogs/
├── index.js              # THE registry — the only shared file a catalog contributor edits
├── bossard/
│   ├── meta.js
│   └── parts.json        # moved from src/data/bossard-db.json
└── <new-supplier>/
```

Static imports only (ADR-003 forbids dynamic `import()` in prod):

```js
import bossardMeta  from './bossard/meta.js'
import bossardParts from './bossard/parts.json'

export const CATALOGS = { bossard: { ...bossardMeta, parts: bossardParts } }
export const DEFAULT_CATALOG = 'bossard'
export function getCatalog(id) { return CATALOGS[id] ?? CATALOGS[DEFAULT_CATALOG] }
export function allParts() {
  return Object.values(CATALOGS).flatMap(c => c.parts.map(p => ({ ...p, supplier: c.id })))
}
```

```js
// src/data/catalogs/bossard/meta.js
export default {
  id:          'bossard',          // stable key, stored in configs — never change once merged
  brand:       'Bossard',
  skuLabel:    'Bossard PN',       // column header in OrderList / poster / label sidebar
  refLabel:    'BN',               // label for catalogRef
  barcode:     'CODE128',          // or null → suppress barcode for this supplier
  productUrl:  sku => `https://www.bossard.com/…/${sku}`,
  source:      { retrieved: '2025-03-11', note: 'Parsed from public BN datasheets' },
  licence:     'Factual dimensional data only; no PDFs redistributed.',
}
```

`skuLabel` alone removes the hard-coded `'Bossard PN'` from `OrderList.js:141` and the
`BN (barcode)` labels from two sidebars.

### 2.3 Normalized entry schema (`doc/CATALOG_SCHEMA.md`)

```json
{
  "sku":        "1386840",
  "catalogRef": "BN 1052",
  "title":      "Threaded inserts for heat/ultrasonic installation",
  "norms":      ["DIN 912"],

  "partType":   "screw",
  "variant":    "washer-large",

  "headType":   "socket",
  "thread":     "M3",
  "length":     8,
  "drive":      "Hex",

  "material":      "Steel",
  "materialGrade": "8.8",
  "shape": { "nutShape": "square", "locking": "nylon", "standoffEnds": "mf" }
}
```

Changes from today: `articleNumber` → `sku`, `bossardNorm` → `catalogRef`, plus
`partType` (was *inferred*), `variant` (was inferred from BN norms) and `shape` (was
sniffed from German titles) now **explicit**. `supplier` is injected by the registry,
never stored in the file. Which dimension fields are required is declared by the part
type and enforced by the validator.

### 2.4 Part record written into user configs

```js
{
  supplier:   'bossard',    // NEW
  sku:        '1386840',    // NEW
  catalogRef: 'BN 1052',    // NEW (replaces bossardNorm)
  partType:   'screw',      // NEW — stored, no longer inferred
  bossardPN:  '1386840',    // DEPRECATED alias, still written for one release
  …
}
```

One read helper handles legacy configs, as with legacy `cabinetType` (ADR-007):

```js
// utils/partIdentity.js
export function partIdentity(part) {
  if (part?.sku)       return { supplier: part.supplier || DEFAULT_CATALOG, sku: part.sku }
  if (part?.bossardPN) return { supplier: 'bossard', sku: part.bossardPN }   // legacy
  return null
}
// partTypes/index.js
export function resolvePartType(part) {
  return part?.partType ?? typeForHeadType(part?.headType) ?? 'screw'
}
```

---

## 3. Work breakdown

Each phase is independently mergeable and leaves the app working.

### Phase 0 — Guardrails first (no behaviour change) — **DONE**

| # | Task | Files |
|---|---|---|
| 0.1 | `doc/CATALOG_SCHEMA.md` — field reference, vocabularies, worked example, and how a part type declares its required fields | new |
| 0.2 | `validateCatalog()` — required fields; vocabulary membership; **per-part-type required dimensions**; duplicate `sku` within a catalog; `thread` metric-only and present in `THREAD_D` + density table; `variant` set where the type declares variants; warn where a type's silhouette needs a `shape` discriminator that is absent | `src/data/catalogs/schema.js` |
| 0.3 | `tools/validate-catalogs.mjs` — run it over every registered catalog, non-zero exit, message names catalog + sku + field | new |
| 0.4 | `npm run validate` / `npm test`; `tools/check-bundle-size.mjs` fails over **4 MB** for `dist/index.html` (baseline 1.20 MB) | `package.json` |
| 0.5 | `.github/workflows/ci.yml` — on `pull_request`: `npm ci && npm run validate && npm run build && npm run check:size` | new |

This is what makes contribution safe: a red X with a precise message instead of a
silently-wrong silhouette or a mispriced order line.

**Shipped as**: `src/data/catalogs/schema.js`, `tools/validate-catalogs.mjs`,
`tools/lib/normalizeLegacy.mjs`, `tools/check-bundle-size.mjs`,
`doc/CATALOG_SCHEMA.md`, `.github/workflows/ci.yml`, plus `validate` / `check:size` /
`test` scripts.

The catalog registry does not exist until Phase 3, so the validator **discovers**
catalogs: it prefers `src/data/catalogs/<id>/parts.json` and falls back to the legacy
`src/data/bossard-db.json` read through `normalizeLegacy.mjs`. That adapter makes today's
implicit inference explicit (`articleNumber`→`sku`, `bossardNorm`→`catalogRef`, BN norm
→ `variant`, German title text → `shape`) and is reused verbatim as the Phase 3.1
migration. Errors fail CI; warnings are reported and grouped. Current state of the
Bossard catalog: **0 errors, 300 warnings** across 923 entries.

#### Findings from Phase 0

Running the validator against the shipped data turned up two real defects.

**F-1 — ~180 entries rendered at the wrong physical size (fixed in 1.6).**
`THREAD_D` in `utils/fastenerDims.js` covered only M2–M10, and `d()` fell back to
**3 mm** for anything else. The catalog contains M1, M1.4, M1.6, M1.7, M2.3, M2.6, M3.5,
M4.5, M7, M12–M36 and every `Ø` pin diameter — about a fifth of all entries. Verified
directly, before the fix:

```
M3    nominal d = 3   headW = 4.5
M6    nominal d = 6   headW = 9
M16   nominal d = 3   headW = 4.5      ← identical to M3
M36   nominal d = 3   headW = 4.5      ← identical to M3
Ø10   nominal d = 3   headW = 4.5      ← identical to M3
```

So an M16 screw and an M36 washer were drawn the same size as an M3, on labels and on the
bin poster. `d()` now parses the numeric part of the thread string, exactly as
`densities.js nominalDiameter()` already did; the two definitions are now one.

Because this changes rendered output it was held until the golden test was in place, and
that test recorded it precisely: 9 of 43 fixtures changed, all with threads outside
M2–M10, and only their silhouettes — descriptions, part records and order-list densities
were untouched, and the M3/M6 controls did not move. In physical units a Ø1 pin was being
drawn 3.00 mm tall and is now 1.00 mm; an M1.6 washer was 6.75 mm across and is now
3.60 mm, which is 2.25 × 1.6 as DIN 125 requires. Validator warnings dropped from 300 to
182; the remainder are density-table gaps, a separate limitation.

**F-2 — one misclassified part (fixed).**
SKU `1284592` (`BN 809`, DIN 6799 `Sicherungsscheiben für Wellen`) is a retaining
ring/E-clip, not a washer. `parse_bossard.py` classified it as one because its title
contains `scheib`, which also gave it a `Ø0.8` *shaft* diameter in the thread field and
no valid washer variant — so it was both undrawable and unreachable in the assigner.
Removed from the catalog, and the parser now recognises retaining rings and skips
unclassifiable files loudly instead of mislabelling them. Retaining rings are a good
candidate part type for Phase 6.

### Phase 1 — Part type registry (pure refactor, no behaviour change) — **DONE**

| # | Task | Files |
|---|---|---|
| 1.1 | Create `src/data/partTypes/` with one module per existing fastener type; move `TYPE_DEFS`/`HEAD_LABELS` labels, the `boundingVolMM3` cases, and the `makeTopView`/`makeSideView` dispatch entries into them | new; `dmConstants.js`, `densities.js`, `fastenerShapes.js` |
| 1.2 | Consolidate the **three** description builders into each type's `describe()`; `buildPartDescription`, `formatDesc` and the two `BinLocationPoster` inline builders all delegate | `dmHelpers.js`, `lsHelpers.js`, `BinLocationPoster.js` |
| 1.3 | `getDensity(part)` replaces `getDensity(thread, headType, length)`; dispatches to `type.volumeMM3()`, generic-cylinder fallback retained | `densities.js`, `OrderList.js:72` |
| 1.4 | Silhouette dispatch routes through `type.svg`; `LabelSheet.js:302` gates on `type.svg != null` instead of `part.headType`, and reads `layout` instead of hard-coding `ht === 'nut' \|\| ht === 'washer'` | `fastenerShapes.js`, `fastenerSvg.js`, `LabelSheet.js` |
| 1.5 | Golden test: assert description, density and SVG output are byte-identical to pre-refactor for a fixture of ~30 representative Bossard parts | new `test/` |
| 1.6 | **Fix F-1**: `d(thread)` parses the numeric part instead of a `THREAD_D` lookup, so M12+ and `Ø` sizes stop rendering at 3 mm. Do this *after* 1.5 so the golden test records the deliberate change. Drop the corresponding validator warning | `fastenerDims.js`, `schema.js` |

1.5 is what makes this refactor safe to merge — it is the only thing standing between a
registry refactor and silently changing every existing user's order quantities.

**Shipped as**: `src/data/partTypes/` — a registry plus one module per type, each owning
its head geometries, labels, description text, packed-volume model and all four silhouette
renderers. `densities.js` keeps only the empirical table; `fastenerShapes.js` becomes an
exported toolkit of shape primitives rather than a dispatcher; `fastenerSvg.js` drops from
440 to 229 lines and owns only canvases and the break overlay. `TYPE_DEFS` and
`HEAD_LABELS` are now views onto the registry.

1.5 was sequenced first, so the golden test existed before anything moved; every step was
then verified with the snapshot file untouched, which is what makes a refactor this wide
safe to merge. `getFastenerSVGLabel` turned out to be a second full per-head renderer
rather than a thin wrapper, so 1.4 was split into dispatch and geometry.

A part type module is now self-contained: `pin.js` is 62 lines covering its label,
description, density and every drawing. A type may omit `svg` entirely and labels fall
back to text — which matters for Phase 6, where an o-ring has no head geometry at all.

### Phase 2 — Data-driven assigner cascade (still fasteners only) — **DONE**

| # | Task | Files |
|---|---|---|
| 2.1 | `dbFilter()` takes an open `{partType, supplier, ...fieldValues}` map instead of fixed fastener keys | `dmHelpers.js` |
| 2.2 | `renderPartAssigner()` (`dmPanels.js:789-1060`) becomes a loop over `type.cascade`, preserving today's behaviours: auto-resolve when one option, read-only info row, early return when unresolved | `dmPanels.js` |
| 2.3 | Per-field sorting from `fields[].sort` replaces `sortThreads()`'s `parseFloat(thread.replace('M',''))` | `dmHelpers.js` |
| 2.4 | Duplicate-length cycling (`dmKeybinds.js:360`) generalises to "advance the type's last numeric cascade field" | `dmKeybinds.js` |

After Phase 2 the app no longer assumes any part has a thread, a head or a drive — but
nothing user-visible has changed yet.

**Shipped as**: `src/views/drawerMap/dmCascade.js`, a pure engine that computes which
questions the assigner asks and what the answers may be; `dmPanels` only renders the
result. Each part type declares its own `cascade`, and `partTypes/_fields.js` says how a
field behaves — how it sorts, how it formats, and what happens when only one option is
left (`never` keeps a dropdown, `info` shows a read-only row, `silent` resolves invisibly).
A step with no options is skipped, so a pin simply never shows a Drive question.

`dbFilter` now takes an open field map, so a part type can filter on dimensions the
function has never heard of. `sortThreads` is gone, replaced by the `thread` comparator.
Duplicating a bin steps along whichever numeric field the type asks about last, rather
than hardcoding length.

**Verified by construction, not by inspection.** `test/cascade-reference.mjs` is the
pre-Phase-2 cascade with the DOM stripped out, frozen. The two implementations were
compared across **all 935 reachable cascade states** — every part type, every combination
of answers — and agree exactly on steps, options, labels and matching SKUs. The
generalised duplicate-stepping was checked the same way: all **923 catalog entries** pick
the same next part as the old inline logic. Both checks are permanent tests, alongside a
snapshot of the engine's own output that keeps protecting the cascade after the reference
retires at Phase 3.4.

Two deliberate differences, both unreachable with current data: `nut` and `washer` no
longer run a Drive step (they have no drives, so it was always skipped), and a head
geometry with no options now falls through to "No matching parts found" instead of
rendering nothing. The pre-populate path also now restores `drive` when reopening a bin,
which the old code omitted.

### Phase 3 — Catalog registry — **DONE**

| # | Task | Files |
|---|---|---|
| 3.1 | Move `bossard-db.json` → `catalogs/bossard/parts.json`; one-shot migration rewrites `articleNumber`→`sku`, `bossardNorm`→`catalogRef`, back-fills `partType`/`variant`/`shape` from the existing BN mappings | `tools/migrate-bossard.mjs` (deleted after use) |
| 3.2 | Add `bossard/meta.js` + `catalogs/index.js` | new |
| 3.3 | Replace the three `import bossardDb …` with registry lookups; identity lookups become `findBySku(supplier, sku)` | `dmHelpers.js`, `dmPanels.js`, `dmKeybinds.js` |
| 3.4 | `variantForEntry()` reads `entry.variant`; `VARIANT_DEFS` `norms` arrays deleted (variants now live on the part type) | `dmHelpers.js`, `dmConstants.js` |

**Shipped as**: `src/data/catalogs/` — `index.js` (registry, `allParts()`, `findBySku()`),
`bossard/meta.js` and `bossard/parts.json`. The three direct `bossard-db.json` imports are
gone; `dbFilter` queries the registry, and identity lookups are `findBySku(supplier, sku)`
rather than matching a bare article number that two suppliers could share.

All 923 entries were migrated to the normalized schema: `articleNumber` → `sku`,
`bossardNorm` → `catalogRef`, and `partType`, `variant` (271 entries) and `shape`
(190 entries) are now stated outright instead of being inferred at runtime from head
types, BN norm numbers and German title text. `variantForEntry()` reads `entry.variant`;
`VARIANT_DEFS` and its norm lists are deleted.

**Proven behaviour-neutral by both snapshots.** The frozen fixtures were migrated through
the same adapter as the catalog, and `golden.snapshot.json` and `cascade.snapshot.json`
are both byte-identical — descriptions, densities, silhouettes, and all 935 cascade
states with their options and matching SKUs. The validator picked up the new layout by
itself (it discovers `catalogs/<id>/parts.json`) and reports the same 0 errors and 182
warnings against the migrated data.

The part record written into user configs is deliberately unchanged here — it still
carries `bossardPN` and `bossardNorm`. Making it supplier-neutral is Phase 4, which is
what keeps this migration provably invisible.

Retired with this phase: `bossard-db.json`, `tools/lib/normalizeLegacy.mjs`, the
validator's legacy fallback, and `test/cascade-reference.mjs` — the last on the schedule
its own header set, since entries now carry `variant` and the norm-matching it encoded is
deliberately gone. `parse_bossard.py` writes the new schema at the new path, so
regenerating the catalog reproduces what is committed.

### Phase 4 — Supplier-neutral part records — **DONE**

| # | Task | Files |
|---|---|---|
| 4.1 | `utils/partIdentity.js`; `dbEntryToPart()` emits `supplier`/`sku`/`catalogRef`/`partType` (+ deprecated `bossardPN`) | `dmHelpers.js`, new util |
| 4.2 | Barcode + PN display read `sku` via `partIdentity()`, labelled from `meta.skuLabel`; honour `meta.barcode === null` | `LabelSheet.js`, `lsSidebar.js`, `dmPanels.js`, `BinLocationPoster.js` |
| 4.3 | OrderList: headers from `meta.skuLabel`, add a `Supplier` column, **split CSV export per supplier** (order lists go to one vendor each) | `OrderList.js` |
| 4.4 | Update `doc/CONFIG_SCHEMA.md` — document `supplier`/`sku`/`catalogRef`/`partType`, mark `bossardPN` deprecated-but-honoured | `doc/CONFIG_SCHEMA.md` |

**Shipped as**: `src/utils/partIdentity.js` plus a part record that carries `supplier`,
`sku`, `catalogRef` and `partType` (and `variant`/`shape`, which Phase 5 needs). Every
read goes through `partIdentity()`, so a config written before suppliers were modelled —
carrying only `bossardPN` — is read as a Bossard part with no migration. `bossardPN` and
`bossardNorm` are still written for one release so older builds can load new configs.

Barcodes and part numbers are now labelled from the catalog's `meta.skuLabel` rather than
the literal string `'Bossard PN'`, and a catalog with `barcode: null` prints no barcode —
an in-house stock list may have nothing worth scanning. OrderList gains a Supplier column
and splits its CSV per supplier, because an order goes to one vendor at a time; with a
single catalog registered both behave exactly as before, so nothing changes visually until
a second supplier exists.

This is the first phase that deliberately changes output. The golden test confirms it
changed only what was intended: of the eight snapshotted outputs, **only `part` moved** —
descriptions, densities and all four silhouettes are untouched. Nine new tests cover the
identity contract, including the legacy read path and a catalog with no barcode format.

### Phase 5 — Remove prose sniffing from geometry — **DONE**

| # | Task | Files |
|---|---|---|
| 5.1 | `washerDims()` switches on `part.variant`; BN literals kept only as a legacy fallback | `fastenerDims.js` |
| 5.2 | `isSquareNut()` → `shape.nutShape === 'square'`; `isMFStandoff()` → `shape.standoffEnds === 'mf'`; nyloc → `shape.locking === 'nylon'` (all three with the current sniffing as legacy fallback) | `fastenerDims.js`, `fastenerShapes.js`, `lsHelpers.js` |

**Shipped as**: `washerDims()` switches on `variant`; `isSquareNut()`, `isMFStandoff()` and
a new `isNylocNut()` read `part.shape`. The nyloc test was duplicated in three places
(`nut.js` twice and `fastenerShapes.sideNut`) and is now one function. The German
keyword matching and BN norm literals survive only as a fallback for part records written
before Phase 4 stored those fields.

**Checked before changing anything.** The migration derived `shape.locking` from a
different condition than the renderer sniffed (`catalogRef === 'BN 161'` or a title
containing "nyloc", versus a description containing "nyloc" or a standard containing
"985"), so the two could have disagreed. Comparing explicit fields against the legacy
guess across all 923 entries gave **zero divergences** on every discriminator, which is
what made the switch provably safe; both snapshots are byte-identical.

Three new tests cover the contract: the fallback still reproduces the old answer on the
whole catalog, an English-language catalog with explicit `shape` is now drawn correctly
(a square nut stays square, a nylon insert nut stays tall, an M/F standoff keeps its
stud), and one that omits `shape` still gets the old wrong answer — which is why the
validator warns about it rather than staying silent.

### Phase 6 — Reference non-fastener part types

Proves the seam. Each ships as one module + validator coverage + a golden test.

| # | Type | Cascade | Volume model (starting values, to be calibrated) |
|---|---|---|---|
| 6.1 | **o-ring** | variant (NBR/FKM/EPDM) → innerD → crossSection | torus `2π²Rr²`, R=(ID+CS)/2, r=CS/2, tangle factor **3.0** |
| 6.2 | **spring** (compression) | variant → outerD → freeLength → wireD | envelope cylinder `π(OD/2)²·L`, tangle factor **2.2** |
| 6.3 | **spacer** (unthreaded) | variant → outerD → innerD → length | annular cylinder `π((OD/2)²−(ID/2)²)·L`, factor **1.4** (matches standoff) |
| 6.4 | Simple silhouettes: o-ring = annulus top + rounded side; spring = coil side; spacer = tube. Any type may set `svg: null` and labels degrade cleanly to text-only | `fastenerShapes.js` or a new `shapes/` dir |
| 6.5 | Rename `utils/fastenerSvg.js` → `utils/partSvg.js` (and `fastenerDims` → `partDims`) once it is no longer fastener-only | renames |

The packing factors are estimates. Document them as such in each module, the way
`densities.js` already documents its calibration, and note that they are the one number a
contributor should expect to tune against a real bin.

### Phase 7 — Multi-supplier UX (only once >1 catalog exists)

| # | Task | Files |
|---|---|---|
| 7.1 | Supplier step in the cascade — auto-skipped when only one catalog is registered, so today's flow is unchanged | `dmPanels.js` |
| 7.2 | Preferred-supplier setting in `state.preferences.supplier` to keep dropdowns short | `state.js`, `DataManager.js` |

### Phase 8 — Contributor tooling and docs

| # | Task | Files |
|---|---|---|
| 8.1 | `tools/importers/bossard/parse.py` (today's script, output path parameterised) + `tools/importers/TEMPLATE.md`: any language, any source, output must pass `npm run validate` | `tools/` |
| 8.2 | `tools/new-catalog.mjs <id> <Brand>` and `tools/new-part-type.mjs <id> <Label>` scaffold the folder/module and print the registry line to paste | new |
| 8.3 | `CONTRIBUTING.md`: the add-a-catalog recipe, the add-a-part-type recipe, licensing rules (no redistributing supplier PDFs — extends `tools/README.md`), and the PII/public-repo rules from `CLAUDE.md` | new |
| 8.4 | ADR-010 (catalog registry) and ADR-011 (part type registry) in `doc/DECISIONS.md`; supersede ADR-006/008; close **OQ-009** | `doc/DECISIONS.md` |
| 8.5 | Refresh `doc/ARCHITECTURE.md` dependency graph + `CLAUDE.md` project structure — both are stale already (they predate `views/drawerMap/*`, `StockOrder`, `BinModels`, `DataManager`) | `doc/ARCHITECTURE.md`, `CLAUDE.md` |

---

## 4. Scope decisions (settled)

1. **Metric only, for threaded parts.** `sortThreads()` NaNs on `1/4-20` and `THREAD_D` /
   the density table have no imperial keys. The validator **rejects non-metric threads**
   with a clear message. Note this constrains the `thread` field specifically — a
   non-fastener type is free to define inch-valued dimensions if a contributor needs them,
   since those go through the type's own `fields` and sort functions.
2. **Bundle budget 4 MB**, enforced in CI from Phase 0 (baseline 1.20 MB — room for roughly
   nine more Bossard-sized catalogs). If it ever binds, the answer is minifying `parts.json`
   and a build-time opt-in list, not `fetch` — ADR-003 stands.
3. **`bossardPN`**: written for one release, read indefinitely, writing dropped after that —
   the same graceful-legacy posture as `cabinetType`.
4. **Non-fastener parts are in scope for v1.** This is why Phases 1–2 (part type registry +
   data-driven cascade) exist and why they come before the catalog work: `partType` must be
   a stored, first-class thing that owns its own dimensions, description, density and
   drawing before springs or o-rings can exist at all. Phase 6 ships o-ring, spring and
   spacer as reference implementations.

## 5. Definition of done

**Adding a catalog**: run `node tools/new-catalog.mjs wurth Würth`, produce `parts.json`
with your own converter, run `npm run validate` for precise per-SKU errors, paste one line
into `catalogs/index.js`, open a PR that CI validates + builds + size-checks. The parts then
appear in the assigner, get correct silhouettes, correct density-based quantities, correctly
labelled barcodes and their own CSV order list — **without touching a view file**.

**Adding a part type**: run `node tools/new-part-type.mjs bearing Bearing`, fill in
`fields`, `cascade`, `describe`, `volumeMM3` and optionally `svg`, register it, and every
view picks it up — **also without touching a view file**.
