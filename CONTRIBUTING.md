# Contributing

Thanks for looking. This project has two deliberate extension points, and most
contributions are one or the other.

| You want to add… | You need | Where |
|---|---|---|
| A supplier's parts | a **catalog** | `cabinet-planner/src/data/catalogs/` |
| A kind of part nothing covers yet | a **part type** | `cabinet-planner/src/data/partTypes/` |

A catalog answers *who sells a part*: SKUs, the supplier's own norms, how its
numbers are labelled and barcoded. A part type answers *what a part is*: its
dimensions, how it is described, how densely it packs in a bin, how it is drawn.
They are independent — adding Würth screws needs only the first; adding o-rings
needs both.

Neither should require touching a view, a renderer or a query. If you find
yourself editing one to add a catalog or a part type, that is a bug in the
extension point, and worth raising as an issue.

## Before you start

```bash
cd cabinet-planner
npm install
npm test          # lint, catalog validation, and the golden snapshots
```

`npm test` must pass before and after your change. It is the same thing CI runs.

## Adding a catalog

```bash
node tools/new-catalog.mjs wurth "Würth"
```

That creates `src/data/catalogs/wurth/` with a `meta.js` to fill in and an empty
`parts.json`, and prints the two lines to paste into
`src/data/catalogs/index.js`.

Then:

1. Write your entries into `parts.json`. The field reference is
   [`doc/CATALOG_SCHEMA.md`](cabinet-planner/doc/CATALOG_SCHEMA.md) — read it, it
   is short and it is where the traps are documented.
2. Put whatever generates that JSON in `tools/importers/<id>/`. Any language, any
   approach; see [`tools/importers/README.md`](cabinet-planner/tools/importers/README.md).
   The only contract is that the output passes validation.
3. `npm run validate`. It reports per-SKU errors and warnings and finds your
   catalog by directory, so it checks your data even before you register it.
4. `npm test`, then open a pull request.

### The two mistakes worth knowing about

**State `partType`, `variant` and `shape` explicitly.** Do not leave them to be
inferred. The app used to guess them from head types, Bossard norm numbers and
German title text, which silently mis-drew any catalog written in another
language — a large washer as a standard one, a square nut as hex, a male-female
standoff as female-female. The validator warns when a `shape` flag the renderer
needs is missing.

**`variant` is required where a type has sub-kinds.** The part assigner filters
on it, so an entry without one is unreachable in the UI even though it is sitting
in the bundle. The validator treats this as an error for exactly that reason.

## Adding a part type

```bash
node tools/new-part-type.mjs bearing Bearing
```

That writes `src/data/partTypes/bearing.js` with every required member present
and prints the rest of the checklist. A part type declares:

- `headTypes` / `headLabels` — the geometries it covers
- `cascade` — the questions the assigner asks, in order
- `describe` / `shortLabel` — its text
- `volumeMM3` — packed volume per piece, which drives every order quantity
- `svg` — optional; omit it and labels fall back to text, which is a fine start

If your type needs a dimension nothing else has, add it to
`partTypes/_fields.js`. `o-ring` is the worked example of a type with no thread,
no head and no length: `oring.js` is 90 lines and nothing outside it knows it
exists.

**Say what packing factor you chose and why.** `volumeMM3` includes a
random-packing penalty, and it determines how many pieces the order list tells
someone to buy. The built-in factors are documented estimates (o-rings 3.0,
springs 2.2, spacers 1.4) — treat yours the same way until you have checked it
against a real bin.

## What `npm test` is protecting

- **`npm run lint`** — narrow on purpose. The rule that matters is `no-undef`:
  an identifier used but never defined is the one class of bug the bundler ships
  happily and the tests cannot see, because it only fails when a user clicks the
  thing.
- **`npm run validate`** — your catalog against the schema. Errors are contract
  violations (unreachable, mispriced, mis-drawn); warnings are degradations the
  app survives.
- **`npm run test:golden`** — snapshots of every description, density and
  silhouette, plus every reachable state of the part assigner. **A change that is
  supposed to change nothing must leave these files untouched.** If you meant to
  change output, run `npm run test:golden:update` and read the diff — that diff
  is the review artefact.

## House rules

This is a public repository.

- **No supplier PDFs, scans or catalog exports.** Commit only factual
  dimensional data — thread sizes, lengths, diameters, article numbers — and
  record where it came from in your catalog's `meta.js`.
- **No real names, email addresses or other personal data** in any file, comment
  or commit message.
- **No internal hostnames, IP addresses, API keys, tokens or credentials**,
  anywhere.
- Sample and default config data uses generic placeholder values, not real
  inventory.

## Conventions

Vanilla ES modules, no framework, no TypeScript, no CSS frameworks. Small focused
functions; each file readable on its own. The production build is a single
`dist/index.html` that must work from `file://` — so no `fetch()` and no dynamic
`import()` in app code, which is why every catalog is statically imported and why
CI enforces a bundle-size budget.

Architecture notes are in
[`doc/ARCHITECTURE.md`](cabinet-planner/doc/ARCHITECTURE.md), and the reasoning
behind the bigger decisions is in
[`doc/DECISIONS.md`](cabinet-planner/doc/DECISIONS.md).
