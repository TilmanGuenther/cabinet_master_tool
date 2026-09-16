/**
 * Part assigner cascade engine.
 *
 * Pure: it computes which questions to ask and what the answers may be, and
 * returns a description. Rendering that description is dmPanels' job, which is
 * what makes the cascade testable without a DOM.
 *
 * The sequence of questions comes from the part type's `cascade`, so a type
 * with entirely different dimensions -- an o-ring asking for inner diameter and
 * cross-section -- needs no change here.
 *
 * At each step the catalog is filtered by everything resolved so far:
 *   - no options left        the step does not apply and is skipped
 *   - exactly one option     resolved automatically; whether that shows as a
 *                            read-only row is the field's `autoResolve`
 *   - more than one          a dropdown, and the cascade stops until answered
 */

import { getField, SORTS } from '../../data/partTypes/_fields.js'
import { getPartType, resolvePartType } from '../../data/partTypes/index.js'
import { dbFilter, uniq } from './dmHelpers.js'
import { CATALOGS } from '../../data/catalogs/index.js'

/**
 * The questions to ask for a part type, including the supplier step.
 *
 * Supplier comes first and only when there is a choice to make: with a single
 * catalog registered it is left out entirely, so nothing about the assigner
 * changes until someone adds a second one.
 */
export function cascadeFor(type) {
  const own = type?.cascade ?? []
  return Object.keys(CATALOGS).length > 1 ? ['supplier', ...own] : own
}

/**
 * @param {object}   args
 * @param {string}   args.typeId      part type id
 * @param {object}   args.selection   answers so far, keyed by field
 * @returns {{steps: object[], resolved: object, matches: object[], complete: boolean}}
 */
export function buildCascade({ typeId, selection = {} }) {
  const type = getPartType(typeId)
  if (!type) return { steps: [], resolved: {}, matches: [], complete: false }

  const base = { headTypes: type.headTypes }
  const resolved = {}
  const steps = []

  // A type that never asks about head geometry has exactly one, so it is known
  // before the first question.
  if (type.headTypes.length === 1) resolved.headType = type.headTypes[0]

  const filterNow = () => ({ ...base, ...resolved })

  for (const key of cascadeFor(type)) {
    const field = getField(key)
    const options = optionsFor(key, field, type, filterNow())

    if (options.length === 0) continue

    if (options.length === 1 && field.autoResolve !== 'never') {
      resolved[key] = options[0].value
      if (field.autoResolve === 'info') {
        steps.push({ kind: 'info', key, label: field.label, text: options[0].label })
      }
      continue
    }

    const chosen = selection[key] ?? null
    steps.push({ kind: 'select', key, label: field.label, options, value: chosen })
    if (chosen == null) {
      return { steps, resolved, matches: [], complete: false }
    }
    resolved[key] = chosen
  }

  return { steps, resolved, matches: dbFilter(filterNow()), complete: true }
}

/**
 * Options for one step, either declared by the part type (variants) or derived
 * from whatever the catalog still offers.
 */
function optionsFor(key, field, type, filter) {
  if (field.fromType) {
    // Declared options, kept in the type's order, minus any the catalog cannot
    // currently satisfy.
    return (type[`${key}s`] ?? [])
      .filter(opt => dbFilter({ ...filter, [key]: opt.value }).length > 0)
      .map(opt => ({ value: opt.value, label: opt.label }))
  }

  let values = uniq(dbFilter(filter).map(entry => entry[key]))
    .filter(v => v !== '' && v != null)

  const cmp = SORTS[field.sort ?? 'none']
  if (cmp) values = [...values].sort(cmp)

  return values.map(v => ({ value: v, label: optionLabel(field, v) }))
}

function optionLabel(field, value) {
  if (field.labelFromCatalog) return CATALOGS[value]?.brand ?? String(value)
  return field.format ? field.format(value) : String(value)
}

// ── Selection bookkeeping ───────────────────────────────────────────

/**
 * Answering a step invalidates everything after it, so later answers are
 * dropped rather than carried into a cascade they may no longer fit.
 */
export function selectionAfter(current, typeId, key, value) {
  const type = getPartType(typeId)
  const order = cascadeFor(type)
  const cut = order.indexOf(key)

  const next = { _binId: current._binId, type: typeId }
  for (const field of order.slice(0, cut)) {
    if (current[field] != null) next[field] = current[field]
  }
  if (value != null) next[key] = coerceFieldValue(key, value)
  return next
}

/** Select elements hand back strings; numeric fields need their type restored. */
export function coerceFieldValue(key, value) {
  return getField(key).numeric ? parseFloat(value) : value
}

// ── Stepping along a cascade ──────────────────────────────────────────────────

/**
 * The next catalog entry one step along this part's last numeric dimension,
 * holding every other dimension constant.
 *
 * Duplicating a bin uses this to walk a size range: duplicate an M3x8 screw and
 * get the M3x10. Which dimension steps is whichever numeric field the part type
 * asks about last -- length for a screw, but a free length for a spring or a
 * cross-section for an o-ring, with no change here.
 *
 * @param {object} entry        catalog entry to step from
 * @param {object} [extraFilter] additional constraints, e.g. pinning a
 *                               supplier's norm so the step stays within one
 *                               product family
 * @returns {object|null} the next entry, or null at the end of the range
 */
export function nextAlongCascade(entry, extraFilter = {}) {
  const type = resolvePartType(entry)
  const cascade = cascadeFor(type)

  // A type may name the dimension to step; otherwise take the last numeric one,
  // which is `length` for every fastener. `stepField: null` opts out entirely.
  const key = type && 'stepField' in type
    ? type.stepField
    : [...cascade].reverse().find(k => getField(k).numeric)
  if (!key || entry[key] == null) return null

  // Hold every other dimension this type distinguishes, so stepping stays
  // inside one product family.
  const held = { headTypes: [entry.headType], ...extraFilter }
  for (const field of cascade) {
    if (field === key) continue
    if (entry[field] != null && entry[field] !== '') held[field] = entry[field]
  }

  // Sort with the field's own comparator, so a thread steps M3 -> M4 -> M5
  // rather than being compared as a string.
  const cmp = SORTS[getField(key).sort ?? 'none'] ?? SORTS.numeric
  const values = uniq(dbFilter(held).map(e => e[key]))
    .filter(v => v != null)
    .sort(cmp)

  const at = values.indexOf(entry[key])
  if (at === -1 || at + 1 >= values.length) return null

  return dbFilter({ ...held, [key]: values[at + 1] })[0] ?? null
}
