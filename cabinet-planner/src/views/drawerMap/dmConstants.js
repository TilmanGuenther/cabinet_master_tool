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
