/**
 * Reference implementation of the part assigner cascade AS IT BEHAVED BEFORE
 * Phase 2, with the DOM stripped out.
 *
 * Transcribed from the pre-Phase-2 renderPartAssigner() in dmPanels.js: the
 * hardcoded Variant -> Thread -> Head -> Drive -> Length sequence, including its
 * auto-resolve rules and its early returns. It exists so the data-driven engine
 * can be proved equivalent against the real catalog rather than by inspection.
 *
 * This is frozen. It is not the current behaviour and must never be "fixed" to
 * track it -- if it and dmCascade.js disagree, that is the finding.
 */

import { TYPE_DEFS, HEAD_LABELS, VARIANT_DEFS } from '../src/views/drawerMap/dmConstants.js'
import { dbFilter, uniq } from '../src/views/drawerMap/dmHelpers.js'

/**
 * The pre-Phase-2 sortThreads(), inlined. It has since been replaced by the
 * `thread` comparator in partTypes/_fields.js; a frozen reference must not
 * import the thing it is checking against.
 */
function sortThreads(threads) {
  return threads.sort((a, b) =>
    parseFloat(a.replace('M', '').replace('\u00D8', '')) -
    parseFloat(b.replace('M', '').replace('\u00D8', '')))
}

export function referenceCascade(typeId, sel = {}) {
  const typeDef = TYPE_DEFS[typeId]
  const steps = []
  if (!typeDef) return { steps, resolved: {}, matches: [], complete: false }

  const resolved = {}
  const stop = () => ({ steps, resolved, matches: [], complete: false })

  // ── Variant ────────────────────────────────────────────────────────────────
  const variantDefs = VARIANT_DEFS[typeId]
  let activeBossardNorms
  let variant = sel.variant

  if (variantDefs) {
    const available = variantDefs.filter(v =>
      dbFilter({ headTypes: typeDef.headTypes, bossardNorms: v.norms }).length > 0)

    if (available.length > 1) {
      steps.push({
        kind: 'select', key: 'variant', label: 'Variant',
        options: available.map(v => ({ value: v.value, label: v.label })),
        value: variant ?? null,
      })
      if (!variant) return stop()
    } else if (available.length === 1 && !variant) {
      variant = available[0].value
    }
    const selected = variantDefs.find(v => v.value === variant)
    if (selected) activeBossardNorms = selected.norms
    if (variant) resolved.variant = variant
  }

  // ── Thread ─────────────────────────────────────────────────────────────────
  const threads = sortThreads(uniq(
    dbFilter({ headTypes: typeDef.headTypes, bossardNorms: activeBossardNorms })
      .map(p => p.thread).filter(Boolean)))

  steps.push({
    kind: 'select', key: 'thread', label: 'Size',
    options: threads.map(t => ({ value: t, label: String(t) })),
    value: sel.thread ?? null,
  })
  if (!sel.thread) return stop()
  resolved.thread = sel.thread

  // ── Head ───────────────────────────────────────────────────────────────────
  let resolvedHead = sel.headType
  if (typeDef.headTypes.length > 1) {
    const headOptions = uniq(
      dbFilter({ headTypes: typeDef.headTypes, thread: sel.thread, bossardNorms: activeBossardNorms })
        .map(p => p.headType))

    if (headOptions.length > 1) {
      steps.push({
        kind: 'select', key: 'headType', label: 'Head',
        options: headOptions.map(ht => ({ value: ht, label: HEAD_LABELS[ht] || ht })),
        value: sel.headType ?? null,
      })
      if (!sel.headType) return stop()
    } else if (headOptions.length === 1) {
      resolvedHead = headOptions[0]
      steps.push({
        kind: 'info', key: 'headType', label: 'Head',
        text: HEAD_LABELS[resolvedHead] || resolvedHead,
      })
    } else {
      return stop()
    }
  } else {
    resolvedHead = typeDef.headTypes[0]
  }
  resolved.headType = resolvedHead

  // ── Drive ──────────────────────────────────────────────────────────────────
  const driveOptions = uniq(
    dbFilter({ headTypes: [resolvedHead], thread: sel.thread, bossardNorms: activeBossardNorms })
      .map(p => p.drive).filter(Boolean))

  let resolvedDrive = null
  if (driveOptions.length > 1) {
    steps.push({
      kind: 'select', key: 'drive', label: 'Drive',
      options: driveOptions.map(dr => ({ value: dr, label: String(dr) })),
      value: sel.drive ?? null,
    })
    if (!sel.drive) return stop()
    resolvedDrive = sel.drive
  } else if (driveOptions.length === 1) {
    resolvedDrive = driveOptions[0]
    steps.push({ kind: 'info', key: 'drive', label: 'Drive', text: String(resolvedDrive) })
  }
  if (resolvedDrive) resolved.drive = resolvedDrive

  // ── Length ─────────────────────────────────────────────────────────────────
  let resolvedLength = null
  if (!['nut', 'washer'].includes(typeId)) {
    const lengths = uniq(
      dbFilter({
        headTypes: [resolvedHead], thread: sel.thread,
        drive: resolvedDrive || undefined, bossardNorms: activeBossardNorms,
      }).map(p => p.length).filter(l => l != null)).sort((a, b) => a - b)

    if (lengths.length > 0) {
      steps.push({
        kind: 'select', key: 'length', label: 'Length',
        options: lengths.map(l => ({ value: l, label: `${l} mm` })),
        value: sel.length ?? null,
      })
      if (sel.length == null) return stop()
      resolvedLength = sel.length
    }
  }
  if (resolvedLength != null) resolved.length = resolvedLength

  const matches = dbFilter({
    headTypes: [resolvedHead], thread: sel.thread,
    drive: resolvedDrive || undefined, length: resolvedLength,
    bossardNorms: activeBossardNorms,
  })

  return { steps, resolved, matches, complete: true }
}
