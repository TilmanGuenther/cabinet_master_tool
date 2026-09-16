/**
 * Shared machinery for the cascade tests: enumerate every reachable state,
 * and reduce a cascade result to a comparable digest.
 */

import { createHash } from 'node:crypto'

import { PART_TYPES } from '../src/data/partTypes/index.js'
import { buildCascade } from '../src/views/drawerMap/dmCascade.js'

/**
 * Reduce a cascade result to something comparable.
 *
 * `resolved` is only meaningful once the cascade completes -- before then it is
 * mid-flight bookkeeping -- and its key order carries no meaning, so it is
 * sorted. Steps and matches are compared in full.
 */
export function digest(result) {
  return JSON.stringify({
    steps: result.steps.map(step => ({
      kind: step.kind,
      key: step.key,
      label: step.label,
      text: step.text ?? null,
      value: step.value ?? null,
      options: step.options?.map(o => [String(o.value), o.label]) ?? null,
    })),
    resolved: result.complete
      ? Object.fromEntries(
          Object.entries(result.resolved)
            .map(([k, v]) => [k, String(v)])
            .sort((a, b) => a[0].localeCompare(b[0])),
        )
      : null,
    // Read either key name so the digest stays comparable across the Phase 3
    // rename of articleNumber -> sku, which must not change any behaviour.
    matches: result.matches.map(m => m.sku ?? m.articleNumber).sort(),
    complete: result.complete,
  })
}

/**
 * Every combination of answers reachable by clicking through the assigner,
 * for every part type.
 *
 * @returns {{typeId: string, selection: object}[]}
 */
export function walkCascade() {
  const states = []

  function visit(typeId, selection, depth) {
    if (depth > 6) return
    states.push({ typeId, selection: { ...selection } })

    const result = buildCascade({ typeId, selection })
    const open = result.steps.find(s => s.kind === 'select' && s.value == null)
    if (!open) return

    for (const option of open.options) {
      visit(typeId, { ...selection, [open.key]: option.value }, depth + 1)
    }
  }

  for (const typeId of Object.keys(PART_TYPES)) visit(typeId, {}, 0)
  return states
}

/**
 * A compact, committable form of a cascade result.
 *
 * `shape` is readable, so a snapshot diff shows at a glance that (say) a step
 * vanished or gained options. `hash` covers the full digest -- every option
 * value and label, and every matching SKU -- so nothing changes silently. The
 * test names the offending state, which can then be reproduced locally in full.
 */
export function summarize(result) {
  const shape = result.steps
    .map(s => `${s.key}:${s.kind}${s.options ? `(${s.options.length})` : ''}`)
    .join(' > ')
  return {
    shape: shape || '(none)',
    matches: result.matches.length,
    complete: result.complete,
    hash: createHash('sha256').update(digest(result)).digest('hex').slice(0, 16),
  }
}
