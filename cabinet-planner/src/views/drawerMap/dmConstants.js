import { PART_TYPES } from '../../data/partTypes/index.js'

export const CELL = 42   // px per Gridfinity grid unit (base, before zoom)
export const INSET = 2   // px gap between grid line and bin edge

export const ZOOM_MIN  = 0.25
export const ZOOM_MAX  = 2.0
export const ZOOM_STEP = 0.25

// Part type metadata is owned by the part type registry; these two exports are
// views onto it so the drawer map keeps its existing shape.
// Adding a part type means adding a module in src/data/partTypes/, not editing
// anything here.

/** partType id -> { label, headTypes }, in assigner dropdown order. */
export const TYPE_DEFS = Object.fromEntries(
  Object.entries(PART_TYPES).map(([id, type]) => [id, { label: type.label, headTypes: type.headTypes }]),
)

/** headType -> human label, flattened across every part type. */
export const HEAD_LABELS = Object.fromEntries(
  Object.values(PART_TYPES).flatMap(type => Object.entries(type.headLabels)),
)

// Variants for types that come in multiple sub-kinds (keyed by TYPE_DEFS key)
// norms: bossardNorm values that belong to this variant
export const VARIANT_DEFS = {
  nut: [
    { value: 'nut-square',    label: 'Square Nut',            norms: ['BN 145', 'BN 3525'] },
    { value: 'nut-nylon',     label: 'Nylon Insert Lock Nut', norms: ['BN 161'] },
    { value: 'nut-hex-thin',  label: 'Thin Hex Nut',          norms: ['BN 20242'] },
  ],
  washer: [
    { value: 'washer-std',    label: 'Standard Washer',       norms: ['BN 715'] },
    { value: 'washer-large',  label: 'Large Washer',          norms: ['BN 729'] },
    { value: 'washer-socket', label: 'Socket Head Washer',    norms: ['BN 726'] },
  ],
  standoff: [
    { value: 'standoff-mf',   label: 'Hex Standoff M/F',      norms: ['BN 3318'] },
    { value: 'standoff-ff',   label: 'Hex Standoff F/F',      norms: ['BN 3319'] },
  ],
}
