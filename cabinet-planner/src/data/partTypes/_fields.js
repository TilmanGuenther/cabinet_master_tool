/**
 * Dimension fields a part type can put in its assigner cascade.
 *
 * A cascade is the sequence of questions the part assigner asks to narrow the
 * catalog down to one SKU. Which questions a type asks is declared by the type;
 * how each one behaves is declared here, once.
 *
 * `autoResolve` decides what happens when only one option is left:
 *   'never'   always show a dropdown, even with a single option
 *   'info'    resolve it and show a read-only row saying what was chosen
 *   'silent'  resolve it with no visible row at all
 *
 * A step whose options are empty is skipped entirely: a pin has no drive, so
 * the drive step simply never appears.
 */

import { headLabel } from './index.js'

/** Sort comparators by name, applied to a step's option values. */
export const SORTS = {
  /** M2, M2.5, M3, M10 -- numeric, ignoring the M or diameter prefix. */
  thread: (a, b) => threadValue(a) - threadValue(b),
  numeric: (a, b) => a - b,
  /** Leave in the order the catalog yielded them. */
  none: null,
}

function threadValue(thread) {
  return parseFloat(String(thread).replace(/^[MØ]/i, '')) || 0
}

export const FIELDS = {
  variant: {
    label: 'Variant',
    autoResolve: 'silent',
    sort: 'none',
    // Variants are declared by the part type, not derived from the catalog, so
    // they keep the order the type lists them in.
    fromType: true,
  },
  thread: {
    label: 'Size',
    autoResolve: 'never',
    sort: 'thread',
  },
  headType: {
    label: 'Head',
    autoResolve: 'info',
    sort: 'none',
    format: ht => headLabel(ht) || ht,
  },
  drive: {
    label: 'Drive',
    autoResolve: 'info',
    sort: 'none',
  },
  length: {
    label: 'Length',
    autoResolve: 'never',
    sort: 'numeric',
    format: mm => `${mm} mm`,
    numeric: true,
  },
}

/** @returns {object} the field descriptor, or a bare default for unknown keys. */
export function getField(key) {
  return FIELDS[key] ?? { label: key, autoResolve: 'info', sort: 'none' }
}
