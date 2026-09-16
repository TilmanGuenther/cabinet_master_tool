#!/usr/bin/env node
/**
 * Fail the build if the single-file output grows past the agreed budget.
 *
 * Every catalog is inlined into dist/index.html by vite-plugin-singlefile --
 * ADR-003 forbids fetch(), so catalog data cannot be loaded on demand. Without
 * a ceiling, each contributed catalog silently makes the app heavier for
 * everyone. See doc/CATALOG_PLUGIN_PLAN.md section 4.2.
 *
 * Usage (from cabinet-planner/, after npm run build):
 *   npm run check:size
 *   npm run check:size -- --budget 6           # override, in MB
 */

import { statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = dirname(dirname(fileURLToPath(import.meta.url)))
const BUNDLE = join(ROOT, 'dist', 'index.html')

/** Budget in megabytes. Raising this is a deliberate decision, not a reflex. */
const DEFAULT_BUDGET_MB = 4

const flagIndex = process.argv.indexOf('--budget')
const budgetMB  = flagIndex !== -1 ? Number(process.argv[flagIndex + 1]) : DEFAULT_BUDGET_MB

if (!Number.isFinite(budgetMB) || budgetMB <= 0) {
  console.error(`Invalid --budget value: ${process.argv[flagIndex + 1]}`)
  process.exit(1)
}

if (!existsSync(BUNDLE)) {
  console.error(`No bundle at ${BUNDLE} - run \`npm run build\` first.`)
  process.exit(1)
}

const bytes    = statSync(BUNDLE).size
const budget   = budgetMB * 1024 * 1024
const actualMB = bytes / 1024 / 1024
const pct      = Math.round((bytes / budget) * 100)

const report = `dist/index.html is ${actualMB.toFixed(2)} MB of the ${budgetMB} MB budget (${pct}%)`

if (bytes > budget) {
  console.error(`FAIL ${report}`)
  console.error('')
  console.error('Options, in order of preference:')
  console.error('  1. Minify the catalog JSON (drop the indent on parts.json)')
  console.error('  2. Strip fields the app never reads from the catalog')
  console.error('  3. Raise the budget deliberately, and record why in doc/DECISIONS.md')
  process.exit(1)
}

console.log(`OK   ${report}`)
