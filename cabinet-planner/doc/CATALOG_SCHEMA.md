# Catalog Schema

Reference for contributors adding a supplier's part database.

A **catalog** is a list of parts a supplier sells. Its job is to answer *who sells it* —
SKUs, norms, barcodes. What a part *is* (its dimensions, how it is described, how densely
it packs, how it is drawn) belongs to its **part type**, which is a separate extension
point. See `doc/CATALOG_PLUGIN_PLAN.md` for how the two fit together.

Run `npm run validate` from `cabinet-planner/` at any point. CI runs it on every pull
request, before the build.

---

## Entry format

Every entry is a flat JSON object. One entry = one orderable SKU.

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

### Identity

| Field | Type | Required | Description |
|---|---|---|---|
| `sku` | string | **yes** | The supplier's own article number. Must be unique within the catalog. Used for the barcode and the order list. |
| `catalogRef` | string | no | The supplier's own norm or series reference (Bossard's `BN 1052`, a McMaster family number). Displayed, never matched against. |
| `title` | string | **yes** | The supplier's description of the part. Shown in the assigner; not used for any logic. |
| `norms` | string[] | no | Public standards the part conforms to, e.g. `["DIN 912", "ISO 4762"]`. |

`supplier` is **not** a field — it is injected from the catalog's directory name. Do not
put it in `parts.json`.

### Classification

| Field | Type | Required | Description |
|---|---|---|---|
| `partType` | string | **yes** | What the part *is*. Drives the description, the density model and the silhouette. One of: `screw`, `nut`, `washer`, `standoff`, `set-screw`, `insert`, `pin`, `press-nut`. |
| `headType` | string | **yes** | Head geometry. Must belong to the declared `partType` (see table below). |
| `variant` | string | depends | Required when the part type has sub-kinds — see [Variants](#variants). |

### Dimensions

Which dimension fields are required depends on `partType`:

| `partType` | `headType` must be one of | `thread` form | `length` | `variant` |
|---|---|---|---|---|
| `screw` | `button`, `socket`, `low-socket`, `countersunk`, `pan`, `flat` | `M…` | **required** | — |
| `nut` | `nut` | `M…` | — | **required** |
| `washer` | `washer` | `M…` | — | **required** |
| `standoff` | `standoff` | `M…` | **required** | **required** |
| `set-screw` | `set-screw` | `M…` | **required** | — |
| `insert` | `insert` | `M…` | **required** | — |
| `pin` | `pin` | `Ø…` | **required** | — |
| `press-nut` | `press-nut` | `M…` | — | — |

| Field | Type | Description |
|---|---|---|
| `thread` | string | **Metric only.** `"M3"`, `"M2.5"` for threaded parts; `"Ø3"` for smooth shanks (dowel pins). Imperial threads are rejected — see [Metric only](#metric-only). |
| `length` | number | Millimetres. Positive. |
| `drive` | string | One of `Hex`, `Torx`, `Phillips`, `Slotted`. Omit for parts with no drive recess. |
| `material` | string | Free text, e.g. `"Steel"`, `"INOX"`. Displayed only. |
| `materialGrade` | string | Free text, e.g. `"8.8"`, `"A2"`. Displayed only. |

### Variants

Some part types come in sub-kinds that are physically different enough to need their own
drawing. When a type has variants, **`variant` is required** — the part assigner filters
on it, so an entry without one is silently unreachable in the UI even though it is in the
bundle. The validator treats this as an error for exactly that reason.

| `partType` | Allowed `variant` values |
|---|---|
| `nut` | `nut-square`, `nut-nylon`, `nut-hex-thin` |
| `washer` | `washer-std`, `washer-large`, `washer-socket` |
| `standoff` | `standoff-mf`, `standoff-ff` |

### Shape discriminators

`shape` states geometry facts the renderer would otherwise have to guess from the title
text. It is optional, but omitting it means the drawing falls back to keyword-sniffing
that only works for German-language Bossard titles — so supply it.

| Flag | Values | Applies to |
|---|---|---|
| `nutShape` | `hex`, `square` | `nut` |
| `locking` | `none`, `nylon` | `nut` |
| `standoffEnds` | `mf` (male/female), `ff` (female/female) | `standoff` |

---

## Metric only

This project is metric-only for threaded parts. `thread` must match `M<number>` or
`Ø<number>`; `1/4-20`, `#4-40` and similar are rejected by the validator.

This constrains the `thread` field specifically. A part type is free to define
inch-valued dimensions of its own, since those go through the type's own field
definitions rather than the thread vocabulary.

### Thread sizes and density

Any metric size draws correctly — the renderer parses the number from the thread string.

The empirical density table in `src/data/densities.js` only has rows for M2, M2.5, M3,
M4, M5, M6, M8 and M10. Nuts, washers and press-in nuts outside that range fall back to
a geometric estimate, and the validator warns so you know the order quantities for those
entries are less precise. Everything else is computed geometrically regardless.

---

## Errors and warnings

`npm run validate` distinguishes the two:

- **Errors** are contract violations. The entry would be unreachable in the UI,
  mispriced in the order list, or drawn as the wrong part. CI fails.
- **Warnings** are degradations the app survives: a fallback diameter, a geometric
  density estimate instead of a tabulated one. CI passes. Run
  `npm run validate -- --strict` to treat them as fatal locally.

Issues are grouped by message with example SKUs, so a systematic mistake across 200
entries reads as one line rather than 200.

---

## Adding a catalog

1. Create `src/data/catalogs/<your-id>/parts.json` with entries in the format above.
2. Add `meta.js` alongside it. Copy `bossard/meta.js` as a template: brand, the label
   for your SKUs, the label for `catalogRef`, barcode format (or `null` for none), and
   where the data came from.
3. Register both in `src/data/catalogs/index.js` — one import pair and one line.
4. Run `npm run validate` and fix what it reports. The validator finds your catalog by
   directory, so it checks your data even before you register it.
5. Run `npm run test:golden` to confirm you have not moved anything that already existed.
6. Open a pull request. CI runs all of the above plus the build and a bundle-size check.

Your parts then appear in the assigner, get silhouettes and density-based order
quantities from their part type, and are labelled and barcoded using your `meta.js` —
without touching a view file.

**Licensing**: commit only factual dimensional data — thread sizes, lengths, article
numbers. Do not commit supplier PDFs or catalog scans. Record where the data came from
and when in your `meta.js`, as `tools/README.md` already requires for the Bossard data.

**Privacy**: this is a public repository. No real names, email addresses, internal
hostnames or credentials in catalog data, comments or commit messages.
