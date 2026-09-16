/**
 * Computes the golden outputs for every fixture.
 *
 * Shared by `golden.test.mjs` (which asserts) and `update-golden.mjs` (which
 * rewrites the snapshot), so the two can never drift.
 *
 * Every value here is something a user sees: the text on a label, the text in
 * the part assigner, the quantity in the order list, the silhouette on a label
 * or poster. Phase 1 of doc/CATALOG_PLUGIN_PLAN.md moves all of it into part
 * type modules; this snapshot is what proves the move changed nothing.
 */

import { FIXTURES } from './fixtures.js'

import { buildPartDescription, dbEntryToPart } from '../src/views/drawerMap/dmHelpers.js'
import { formatDesc } from '../src/views/labelSheet/lsHelpers.js'
import { getDensity } from '../src/data/densities.js'
import {
  getPartSVG,
  getPartSVGLabel,
  getPartSVGLabelTop,
  getPartSVGLabelReduced,
} from '../src/utils/partSvg.js'

export function computeGolden() {
  return FIXTURES.map(fixture => {
    const { _why, ...entry } = fixture
    const part = dbEntryToPart(entry)

    return {
      sku: entry.sku,
      why: _why,

      // Text shown in the part assigner and stored as part.description
      describe: buildPartDescription(entry),
      // Compact text printed on labels
      shortLabel: formatDesc(part),
      // The full part record written into a user's config
      part,
      // Pieces per ml, which drives every order-list quantity. Called the way
      // OrderList calls it, fallbacks included.
      density: getDensity({
        ...part,
        thread:   part.thread   || 'M3',
        headType: part.headType || 'socket',
      }),

      // Silhouettes: assigner preview, label side, label top, shortened side
      svg: getPartSVG(part),
      svgLabel: getPartSVGLabel(part),
      svgLabelTop: getPartSVGLabelTop(part),
      svgLabelReduced: getPartSVGLabelReduced(part),
    }
  })
}
