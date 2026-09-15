/**
 * Undo/redo history for bin arrays within individual drawers.
 *
 * Each drawer maintains its own independent undo and redo stacks.
 * Call pushHistory(drawerId, currentBins) BEFORE mutating the bins array.
 * The undo/redo functions both take currentBins so they can populate the
 * opposite stack, enabling a full round-trip without separate push calls.
 *
 * Stacks are capped at MAX_STACK entries (oldest entries are dropped first).
 */

const MAX_STACK = 100

// Map<drawerId, { undoStack: bins[][], redoStack: bins[][] }>
const _stacks = new Map()

function getStacks(drawerId) {
  if (!_stacks.has(drawerId)) {
    _stacks.set(drawerId, { undoStack: [], redoStack: [] })
  }
  return _stacks.get(drawerId)
}

/**
 * Snapshot the current bins before a mutation.
 * Any pending redo history is discarded — a new action starts a fresh branch.
 * @param {string} drawerId
 * @param {object[]} currentBins  Live bins array (will be deep-cloned).
 */
export function pushHistory(drawerId, currentBins) {
  const { undoStack, redoStack } = getStacks(drawerId)
  undoStack.push(JSON.parse(JSON.stringify(currentBins)))
  if (undoStack.length > MAX_STACK) undoStack.shift()
  redoStack.length = 0
}

/**
 * Undo the last action.
 * Saves current bins to the redo stack and returns the previous bins.
 * @param {string} drawerId
 * @param {object[]} currentBins  Live bins array (will be deep-cloned into redo stack).
 * @returns {object[]|null}  Previous bins to apply, or null if nothing to undo.
 */
export function undo(drawerId, currentBins) {
  const { undoStack, redoStack } = getStacks(drawerId)
  if (undoStack.length === 0) return null
  redoStack.push(JSON.parse(JSON.stringify(currentBins)))
  if (redoStack.length > MAX_STACK) redoStack.shift()
  return undoStack.pop()
}

/**
 * Redo the last undone action.
 * Saves current bins to the undo stack and returns the next bins.
 * @param {string} drawerId
 * @param {object[]} currentBins  Live bins array (will be deep-cloned into undo stack).
 * @returns {object[]|null}  Next bins to apply, or null if nothing to redo.
 */
export function redo(drawerId, currentBins) {
  const { undoStack, redoStack } = getStacks(drawerId)
  if (redoStack.length === 0) return null
  undoStack.push(JSON.parse(JSON.stringify(currentBins)))
  if (undoStack.length > MAX_STACK) undoStack.shift()
  return redoStack.pop()
}

/** Returns true if there is at least one action that can be undone. */
export function canUndo(drawerId) {
  return (_stacks.get(drawerId)?.undoStack.length ?? 0) > 0
}

/** Returns true if there is at least one action that can be redone. */
export function canRedo(drawerId) {
  return (_stacks.get(drawerId)?.redoStack.length ?? 0) > 0
}

/** Discard all history for a drawer (e.g. when drawer config is replaced externally). */
export function clearHistory(drawerId) {
  _stacks.delete(drawerId)
}
