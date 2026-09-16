# Tools

| Script | Purpose |
|---|---|
| `validate-catalogs.mjs` | Check every catalog against `src/data/catalogs/schema.js`. `npm run validate` |
| `check-bundle-size.mjs` | Hold `dist/index.html` to the agreed budget. `npm run check:size` |
| `new-catalog.mjs` | Scaffold a supplier catalog: `node tools/new-catalog.mjs wurth "Würth"` |
| `new-part-type.mjs` | Scaffold a part type: `node tools/new-part-type.mjs bearing Bearing` |
| `importers/` | One directory per catalog, turning a supplier's data into `parts.json` |

See [`importers/README.md`](importers/README.md) for how to write an importer, and
[`../doc/CATALOG_SCHEMA.md`](../doc/CATALOG_SCHEMA.md) for the entry format.
Contributor-facing guidance lives in [`CONTRIBUTING.md`](../../CONTRIBUTING.md).
