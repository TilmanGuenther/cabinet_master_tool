# Config JSON Schema

The config JSON is the **source of truth** for the cabinet contents. The app is a viewer and generator; the JSON defines what is in each cabinet and each drawer.

## Top-Level Structure

```json
{
  "cabinets": [ ... ]
}
```

## Cabinet

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique cabinet identifier (e.g. `"cabinet-1"`) |
| `name` | string | Display name for the cabinet |
| `cabinetType` | string | Cabinet type key from `cabinetTypes.js` (e.g. `"lista_75"`). Defaults to `"lista_75"` if absent (backwards-compatible). |
| `innerWidthMM` | number | Inner usable width in mm |
| `innerDepthMM` | number | Inner usable depth in mm |
| `totalFrontHeightMM` | number | Total front panel height in mm |
| `gridW` | number | Gridfinity units in width — `floor((innerWidthMM − 5) / 42)` |
| `gridH` | number | Gridfinity units in depth — `floor((innerDepthMM − 5) / 42)` |
| `labelSheet` | object | Label printing configuration |
| `drawers` | array | Array of drawer objects |

The 5 mm safety margin and 42 mm Gridfinity base unit are fixed physical constants. The height margin (front panel → usable interior) is per-type and defined in `src/data/cabinetTypes.js`.

## Label Sheet Config

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `columns` | number | 3 | Labels per row |
| `rows` | number | 7 | Label rows per page |
| `widthMM` | number | 63.5 | Label width in mm |
| `heightMM` | number | 38.1 | Label height in mm |
| `preset` | string | `"Avery L7160"` | Human-readable preset name |

## Drawer

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique drawer identifier (auto-generated) |
| `order` | number | Sort order within the cabinet (0-based) |
| `label` | string | Human-readable label (e.g. `"M3 Screws"`) |
| `frontHeight` | number | Front panel height in mm; valid values depend on `cabinet.cabinetType` |
| `usableInnerHeight` | number | `frontHeight − heightMarginMM` (margin is type-specific, e.g. 17.5 mm for LISTA) |
| `maxHeightUnits` | number | `floor(usableInnerHeight / 7)` — maximum Gridfinity height units |
| `color` | string | Hex color for the drawer (e.g. `"#f5c842"`) |
| `gridW` | number | Inherited from cabinet `gridW` |
| `gridH` | number | Inherited from cabinet `gridH` |
| `defaultHeightUnits` | number | *(optional)* Fallback height units for new bins created in this drawer |
| `bins` | array | Array of bin objects placed in this drawer |

## Bin

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique bin identifier |
| `x` | number | X position in grid (0-based, left edge) |
| `y` | number | Y position in grid (0-based, top edge) |
| `w` | number | Width in grid units |
| `h` | number | Height (depth) in grid units |
| `heightUnits` | number | Bin wall height in 7 mm units |
| `part` | object | Part stored in this bin |
| `overrides` | object | *(optional)* Per-bin label overrides — see below |

## Part

A self-contained snapshot of the catalog entry, taken when the part was
assigned. The config remains the source of truth: a part keeps working even if
the catalog it came from is later changed or removed.

### Identity

| Field | Type | Description |
|-------|------|-------------|
| `supplier` | string | Catalog id the part came from, e.g. `"bossard"` |
| `sku` | string | The supplier's article number |
| `catalogRef` | string | The supplier's own norm or series reference, e.g. `"BN 912"` |
| `partType` | string | What the part is: `screw`, `nut`, `washer`, `standoff`, `set-screw`, `insert`, `pin`, `press-nut` |

`supplier` and `sku` are only meaningful together — SKUs are unique within a
catalog, not across suppliers.

### Description and dimensions

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Human-readable part name |
| `title` | string | *(optional)* The supplier's own description |
| `standard` | string | DIN/ISO standard (e.g. `"DIN 912"`) |
| `thread` | string | Thread size (e.g. `"M3"`), or a nominal diameter (`"Ø3"`) for pins |
| `length` | number | Length in mm (`null` for nuts and washers) |
| `drive` | string | Drive type (e.g. `"Torx"`) |
| `headType` | string | Head geometry (e.g. `"socket"`, `"button"`, `"nut"`, `"washer"`) |
| `material` | string | *(optional)* Material (e.g. `"Steel"`, `"Stainless"`) |
| `materialGrade` | string | *(optional)* Material grade (e.g. `"8.8"`, `"A2"`) |
| `variant` | string | *(optional)* Sub-kind, e.g. `"nut-square"`, `"washer-large"` |
| `shape` | object | *(optional)* Geometry discriminators for the silhouette: `nutShape`, `locking`, `standoffEnds` |

### Deprecated

| Field | Type | Description |
|-------|------|-------------|
| `bossardPN` | string | Superseded by `sku`. Still written, so older builds can read new configs; read indefinitely, so older configs keep working. |
| `bossardNorm` | string | Superseded by `catalogRef`, on the same terms. |

A config that carries only `bossardPN` — written before suppliers were
modelled — is read as a Bossard part. No migration is needed.

## Bin Overrides

The optional `overrides` block lets you customize how a bin appears on labels without changing the underlying part data.

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | *(optional)* Override the printed description text |
| `standard` | string | *(optional)* Override the printed standard/norm text |
| `bn` | string | *(optional)* Override the Bossard PN used for the barcode |
| `disableImage` | boolean | *(optional)* If `true`, suppress the SVG silhouette on the label |
| `reduceImageLength` | boolean | *(optional)* If `true`, render a shortened side-view silhouette (for long screws in narrow bins) |

## Example

```json
{
  "cabinets": [
    {
      "id": "cabinet-1",
      "name": "Workshop Cabinet",
      "cabinetType": "lista_75",
      "innerWidthMM": 565,
      "innerDepthMM": 574,
      "totalFrontHeightMM": 1200,
      "gridW": 13,
      "gridH": 13,
      "labelSheet": {
        "columns": 3,
        "rows": 7,
        "widthMM": 63.5,
        "heightMM": 38.1,
        "preset": "Avery L7160"
      },
      "drawers": [
        {
          "id": "drawer-1",
          "order": 0,
          "label": "M3 Screws",
          "frontHeight": 75,
          "usableInnerHeight": 57.5,
          "maxHeightUnits": 8,
          "color": "#f5c842",
          "gridW": 13,
          "gridH": 13,
          "bins": [
            {
              "id": "bin-m3x10",
              "x": 0, "y": 0, "w": 2, "h": 1,
              "heightUnits": 6,
              "part": {
                "description": "M3x10 Socket Head Torx",
                "standard": "DIN 912",
                "bossardPN": "1127952",
                "thread": "M3",
                "length": 10,
                "drive": "Torx",
                "headType": "socket"
              }
            },
            {
              "id": "bin-m3x40",
              "x": 2, "y": 0, "w": 1, "h": 1,
              "heightUnits": 6,
              "part": {
                "description": "M3x40 Socket Head Torx",
                "standard": "DIN 912",
                "bossardPN": "1127980",
                "thread": "M3",
                "length": 40,
                "drive": "Torx",
                "headType": "socket"
              },
              "overrides": {
                "reduceImageLength": true
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Validation Notes

- Bin positions must not overlap within a drawer (enforced by DrawerMap's collision detection when placing bins interactively; not validated on JSON import)
- `x + w` must be ≤ `gridW`, `y + h` must be ≤ `gridH`
- `sku` can be an empty string — the app handles this gracefully (the barcode is omitted)
- `densityKey` is derived at runtime as `"{thread}-{headType}"` — it is not stored in the config
- `gridW` and `gridH` on drawers are inherited from their parent cabinet and kept in sync on drawer creation
- The `overrides` object is entirely optional; omitting it (or any field within it) falls back to the computed value from `part`
- `reduceImageLength` is auto-set by DrawerMap when a long screw is assigned to a 1-unit-wide bin, but can be overridden manually
