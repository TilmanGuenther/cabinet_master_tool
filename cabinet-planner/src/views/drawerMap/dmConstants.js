export const CELL = 42   // px per Gridfinity grid unit (base, before zoom)
export const INSET = 2   // px gap between grid line and bin edge

export const ZOOM_MIN  = 0.25
export const ZOOM_MAX  = 2.0
export const ZOOM_STEP = 0.25

export const TYPE_DEFS = {
  screw:       { label: 'Screw',     headTypes: ['button', 'socket', 'low-socket', 'countersunk'] },
  nut:         { label: 'Nut',       headTypes: ['nut'] },
  washer:      { label: 'Washer',    headTypes: ['washer'] },
  standoff:    { label: 'Standoff',  headTypes: ['standoff'] },
  'set-screw': { label: 'Set Screw', headTypes: ['set-screw'] },
  insert:      { label: 'Insert',    headTypes: ['insert'] },
  pin:         { label: 'Pin',       headTypes: ['pin'] },
  'press-nut': { label: 'Press-In Nut', headTypes: ['press-nut'] },
}

export const HEAD_LABELS = {
  button:       'Button Head',
  socket:       'Socket Head',
  'low-socket': 'Low Socket Head',
  countersunk:  'Countersunk',
  nut:          'Nut',
  washer:       'Washer',
  standoff:     'Standoff',
  'set-screw':  'Set Screw',
  insert:       'Threaded Insert',
  pin:          'Cylindrical Pin',
  'press-nut':  'Press-In Nut',
}

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
