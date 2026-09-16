# Catalog importers

One directory per catalog, holding whatever turns that supplier's data into
`src/data/catalogs/<id>/parts.json`.

```
tools/importers/
├── README.md          this file
└── bossard/
    ├── parse.py       PDF datasheets -> parts.json
    ├── requirements.txt
    └── pdfs/          source datasheets (not committed -- see below)
```

## The contract

There is only one, and it is deliberately loose:

> **Whatever your importer writes must pass `npm run validate`.**

Language, approach and dependencies are yours. The Bossard importer happens to
be Python parsing PDFs with PyMuPDF; a CSV export and twenty lines of `jq` is
just as valid, and so is hand-writing the JSON if the catalog is small.

Read `doc/CATALOG_SCHEMA.md` for the fields, then:

```bash
cd cabinet-planner
npm run validate          # per-SKU errors and warnings
npm run test:golden       # nothing that already existed moved
```

## Writing one

1. `node tools/new-catalog.mjs <id> <Brand>` scaffolds the catalog directory and
   prints the registry line to paste.
2. Put your importer in `tools/importers/<id>/`, writing to
   `src/data/catalogs/<id>/parts.json`.
3. Resolve paths from the repo root rather than the working directory, so the
   script runs from anywhere:
   ```python
   ROOT = Path(__file__).resolve().parents[3]
   OUT_FILE = ROOT / "src" / "data" / "catalogs" / "<id>" / "parts.json"
   ```
4. Emit the normalized schema directly. Do not leave `partType`, `variant` or
   `shape` to be guessed later: guessing them from title text is exactly what
   this project spent several refactors removing, and it silently mis-draws any
   catalog that is not in the language the guesser was written for.
5. Skip loudly. If your source has a row you cannot classify, print a warning and
   drop it rather than emitting a half-filled entry — a mislabelled part is worse
   than a missing one.

## Source data

**Do not commit supplier PDFs, scans or catalog exports.** They are the
supplier's copyright. Commit only the factual dimensional data your importer
extracts — thread sizes, lengths, diameters, article numbers — and add the
source directory to `.gitignore`.

Record where the data came from and when in your catalog's `meta.js`:

```js
source: {
  retrieved: '2025-03-11',
  note: 'Parsed from public BN datasheets with tools/importers/bossard/parse.py',
},
```

That is what makes a stale catalog diagnosable a year from now. Freshness is a
manual, per-catalog decision precisely because the sources cannot be
redistributed — nothing can re-fetch them for you.
