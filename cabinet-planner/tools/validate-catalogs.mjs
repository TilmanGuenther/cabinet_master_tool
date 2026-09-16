#!/usr/bin/env node
/**
 * Validate every part catalog against the schema in
 * src/data/catalogs/schema.js.
 *
 * Usage (from cabinet-planner/):
 *   npm run validate               # errors fail the run, warnings are reported
 *   npm run validate -- --strict   # warnings fail the run too
 *
 * Catalogs are discovered by convention: every
 * src/data/catalogs/<id>/parts.json is checked, so a contributor's catalog is
 * validated as soon as the directory exists, registry entry or not.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { validateCatalog } from '../src/data/catalogs/schema.js'

const ROOT        = dirname(dirname(fileURLToPath(import.meta.url)))
const CATALOG_DIR = join(ROOT, 'src', 'data', 'catalogs')

const STRICT = process.argv.includes('--strict')

// -- ANSI helpers (disabled when not a TTY or when NO_COLOR is set) -----------

const ESC   = String.fromCharCode(27)
const COLOR = process.stdout.isTTY && !process.env.NO_COLOR
const c = (code, s) => (COLOR ? `${ESC}[${code}m${s}${ESC}[0m` : s)
const red    = s => c('31', s)
const yellow = s => c('33', s)
const green  = s => c('32', s)
const dim    = s => c('2',  s)
const bold   = s => c('1',  s)

const BULLET = '•'
const TICK   = '✓'
const CROSS  = '✗'
const TIMES  = '×'

// -- Discovery ---------------------------------------------------------------

function readJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function discoverCatalogs() {
  const found = []

  if (existsSync(CATALOG_DIR)) {
    for (const name of readdirSync(CATALOG_DIR).sort()) {
      const dir = join(CATALOG_DIR, name)
      if (!statSync(dir).isDirectory()) continue
      const partsFile = join(dir, 'parts.json')
      if (!existsSync(partsFile)) continue
      found.push({
        id: name,
        parts: readJSON(partsFile),
        source: `src/data/catalogs/${name}/parts.json`,
      })
    }
  }

  return found
}

// -- Reporting ---------------------------------------------------------------

/** Collapse repeated issues: one line per distinct message, with example SKUs. */
function group(issues) {
  const byMessage = new Map()
  for (const issue of issues) {
    const key = `${issue.field}::${issue.message}`
    if (!byMessage.has(key)) byMessage.set(key, { ...issue, skus: [] })
    byMessage.get(key).skus.push(issue.sku)
  }
  return [...byMessage.values()].sort((a, b) => b.skus.length - a.skus.length)
}

function printGroup(issues, tint, label) {
  if (issues.length === 0) return
  console.log(`  ${tint(bold(`${label} (${issues.length})`))}`)
  for (const g of group(issues)) {
    const examples = g.skus.slice(0, 3).join(', ')
    const more     = g.skus.length > 3 ? dim(` +${g.skus.length - 3} more`) : ''
    const count    = g.skus.length > 1 ? dim(` ${TIMES}${g.skus.length}`) : ''
    console.log(`    ${tint(BULLET)} ${bold(g.field)}${count}: ${g.message}`)
    console.log(`      ${dim(`e.g. ${examples}${more}`)}`)
  }
  console.log()
}

// -- Main --------------------------------------------------------------------

const catalogs = discoverCatalogs()

if (catalogs.length === 0) {
  console.error(red('No catalogs found.'))
  console.error(dim(`Looked for <id>/parts.json under ${CATALOG_DIR}`))
  process.exit(1)
}

let totalErrors = 0
let totalWarnings = 0

for (const catalog of catalogs) {
  const { errors, warnings } = validateCatalog(catalog)
  totalErrors   += errors.length
  totalWarnings += warnings.length

  const status = errors.length ? red('FAIL') : warnings.length ? yellow('WARN') : green('OK')
  console.log(`${status} ${bold(catalog.id)} ${dim(`- ${catalog.parts.length} entries - ${catalog.source}`)}`)

  printGroup(errors, red, 'Errors')
  printGroup(warnings, yellow, 'Warnings')
}

const summary = `${catalogs.length} catalog(s), ${totalErrors} error(s), ${totalWarnings} warning(s)`

if (totalErrors > 0) {
  console.error(red(bold(`${CROSS} ${summary}`)))
  process.exit(1)
}
if (STRICT && totalWarnings > 0) {
  console.error(yellow(bold(`${CROSS} ${summary} (--strict: warnings are fatal)`)))
  process.exit(1)
}
console.log(green(bold(`${TICK} ${summary}`)))
