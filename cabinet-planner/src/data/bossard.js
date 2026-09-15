/**
 * Hardcoded Bossard fastener catalog.
 *
 * bossardPN: real Bossard article number where known, empty string otherwise.
 * densityKey: matches keys in densities.js for bulk density lookup.
 *
 * This catalog is the starting point — users can reference it when building
 * their config JSON but the config itself is the source of truth for what's
 * in the cabinet.
 */

// --- Helpers to reduce repetition ---

function socket(thread, length, pn = '') {
  return {
    bossardPN: pn,
    description: `${thread}x${length} Socket Head Torx`,
    standard: 'DIN 912',
    thread, length,
    drive: 'Torx',
    headType: 'socket',
    densityKey: `${thread}-socket`,
  }
}

function button(thread, length, pn = '') {
  return {
    bossardPN: pn,
    description: `${thread}x${length} Button Head Torx`,
    standard: 'ISO 7380',
    thread, length,
    drive: 'Torx',
    headType: 'button',
    densityKey: `${thread}-button`,
  }
}

function countersunk(thread, length, pn = '') {
  return {
    bossardPN: pn,
    description: `${thread}x${length} Countersunk Torx`,
    standard: 'DIN 7991',
    thread, length,
    drive: 'Torx',
    headType: 'countersunk',
    densityKey: `${thread}-countersunk`,
  }
}

function hexNut(thread, pn = '') {
  return {
    bossardPN: pn,
    description: `${thread} Hex Nut`,
    standard: 'DIN 934',
    thread, length: 0,
    drive: '',
    headType: 'nut',
    densityKey: `${thread}-nut`,
  }
}

function nylocNut(thread, pn = '') {
  return {
    bossardPN: pn,
    description: `${thread} Nyloc Nut`,
    standard: 'DIN 985',
    thread, length: 0,
    drive: '',
    headType: 'nut',
    densityKey: `${thread}-nut`,
  }
}

function washer(thread, pn = '') {
  return {
    bossardPN: pn,
    description: `${thread} Washer`,
    standard: 'DIN 125',
    thread, length: 0,
    drive: '',
    headType: 'washer',
    densityKey: `${thread}-washer`,
  }
}

function standoff(thread, length, pn = '') {
  return {
    bossardPN: pn,
    description: `${thread}x${length} Threaded Standoff`,
    standard: '',
    thread, length,
    drive: '',
    headType: 'standoff',
    densityKey: `${thread}-standoff`,
  }
}

// --- Catalog ---

export const catalog = [
  // ========== M2 ==========
  // Socket head (DIN 912)
  ...[4, 5, 6, 8, 10, 12, 16, 20].map(l => socket('M2', l)),
  // Button head (ISO 7380)
  ...[4, 5, 6, 8, 10, 12, 16].map(l => button('M2', l)),
  // Countersunk (DIN 7991)
  ...[4, 5, 6, 8, 10, 12, 16].map(l => countersunk('M2', l)),
  // Hardware
  hexNut('M2'),
  nylocNut('M2'),
  washer('M2'),

  // ========== M2.5 ==========
  ...[4, 5, 6, 8, 10, 12, 16, 20].map(l => socket('M2.5', l)),
  ...[4, 5, 6, 8, 10, 12, 16].map(l => button('M2.5', l)),
  ...[4, 5, 6, 8, 10, 12, 16].map(l => countersunk('M2.5', l)),
  hexNut('M2.5'),
  nylocNut('M2.5'),
  washer('M2.5'),

  // ========== M3 ==========
  // Socket head (DIN 912) — most complete range
  ...[4, 5, 6, 8, 10, 12, 16, 20, 25, 30, 35, 40, 50].map(l => socket('M3', l)),
  // Button head (ISO 7380)
  ...[4, 5, 6, 8, 10, 12, 16, 20, 25, 30].map(l => button('M3', l)),
  // Countersunk (DIN 7991)
  ...[4, 5, 6, 8, 10, 12, 16, 20, 25, 30].map(l => countersunk('M3', l)),
  // Hardware
  hexNut('M3'),
  nylocNut('M3'),
  washer('M3'),
  // Standoffs
  ...[6, 8, 10, 12, 15, 20, 25, 30].map(l => standoff('M3', l)),

  // ========== M4 ==========
  ...[6, 8, 10, 12, 16, 20, 25, 30, 35, 40, 50].map(l => socket('M4', l)),
  ...[6, 8, 10, 12, 16, 20, 25, 30].map(l => button('M4', l)),
  ...[6, 8, 10, 12, 16, 20, 25, 30].map(l => countersunk('M4', l)),
  hexNut('M4'),
  nylocNut('M4'),
  washer('M4'),
  ...[8, 10, 12, 15, 20, 25].map(l => standoff('M4', l)),
]
