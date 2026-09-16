#!/usr/bin/env node
/**
 * Rewrite test/golden.snapshot.json from the current code.
 *
 * Run this ONLY when you intend to change user-visible output, and read the
 * resulting diff before committing it -- that diff is the review artefact for
 * the change. A refactor that is supposed to change nothing must leave this
 * file untouched.
 *
 *   npm run test:golden:update
 */
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { computeGolden } from './compute-golden.mjs'

const SNAPSHOT = join(dirname(fileURLToPath(import.meta.url)), 'golden.snapshot.json')

const golden = computeGolden()
writeFileSync(SNAPSHOT, JSON.stringify(golden, null, 2) + '\n')

console.log(`Wrote ${golden.length} golden records to test/golden.snapshot.json`)
console.log('Review the diff: it is the record of what this change does to user-visible output.')
