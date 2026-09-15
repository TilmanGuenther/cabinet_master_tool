# Physical Reference

Dimensions and measurements for the hardware this tool targets.

## Cabinet Types

Cabinet-specific dimensions (drawer front heights, usable interior height margin, and default inner dimensions) are defined in `src/data/cabinetTypes.js`. Adding support for a new brand means adding one entry there — see the comments in that file for a step-by-step guide.

### LISTA (standard series) — `lista_75`

- **Drawer front heights**: 50, 75, 100, 125, 150, 200, 250, 300 mm
- **Height margin**: 17.5 mm (front height → usable interior height)
- **Default internal dimensions**: 565 mm wide × 574 mm deep
- **Usable Gridfinity grid**: 13 × 13 units (546 mm × 546 mm, with ~10 mm margin on each side)

## Gridfinity

- **Base unit**: 42mm × 42mm
- **Height unit**: 7mm per unit
- **Common bin heights**: 3 (21mm), 4 (28mm), 5 (35mm), 6 (42mm)
- **Wall thickness**: approximately 15% of gross volume (used in fill calculations)

## Volume Calculations

```
Gross volume (mm³) = (w × 42) × (h × 42) × (heightUnits × 7)
Net volume (mm³)   = gross × 0.85   (15% wall reduction)
Volume (ml)        = net / 1000
Target pieces      = volume_ml × density_pcs_per_ml × 0.80  (80% fill)
```

## Label Sheets

Default target: **Avery L7160** (or equivalent)
- 3 columns × 7 rows = 21 labels per A4 sheet
- Label size: 63.5mm × 38.1mm
- Configurable via `cabinet.labelSheet` in the config JSON
