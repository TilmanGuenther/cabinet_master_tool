import { getState } from '../../state.js'

// ── Module-level state (survives re-renders) ──────────────────────────────────
let _selDrawerId = null
let _selBinIds   = new Set()   // IDs of all currently selected bins
let _container   = null
let _rerenderListener = null
let _createMode  = false
let _zoom        = 1.0
let _keyHandler  = null
let _clipboardBins = null      // array of bins (positions normalized to 0,0 origin) copied via Ctrl+C
let _mouseGridCell = null      // { x, y } grid cell under the mouse cursor

// Cascade state for part assigner — reset when selected bin changes
let _partSel = {}

// ── Rerender function pointer (set by DrawerMap.js to avoid circular imports) ─
let _rerenderFn = null
export function setRerenderFn(fn) { _rerenderFn = fn }

// ── Getters ───────────────────────────────────────────────────────────────────

export function getSelDrawerId() { return _selDrawerId }
export function getSelBinIds() { return _selBinIds }
export function getContainer() { return _container }
export function getRerenderListener() { return _rerenderListener }
export function getCreateMode() { return _createMode }
export function getZoom() { return _zoom }
export function getKeyHandler() { return _keyHandler }
export function getClipboardBins() { return _clipboardBins }
export function getMouseGridCell() { return _mouseGridCell }
export function getPartSel() { return _partSel }

// Returns the single selected bin ID, or null if 0 or 2+ are selected.
export function selBinId() { return _selBinIds.size === 1 ? [..._selBinIds][0] : null }

// ── Setters ───────────────────────────────────────────────────────────────────

export function setSelDrawerId(id) { _selDrawerId = id }
export function setSelBinIds(val) { _selBinIds = val }
export function setContainer(el) { _container = el }
export function setRerenderListener(fn) { _rerenderListener = fn }
export function setCreateMode(val) { _createMode = val }
export function setZoom(val) { _zoom = val }
export function setKeyHandler(fn) { _keyHandler = fn }
export function setClipboardBins(val) { _clipboardBins = val }
export function setMouseGridCell(val) { _mouseGridCell = val }
export function setPartSel(val) { _partSel = val }

// ── Re-render (selection changes only — no state mutation) ────────────────────

export function rerender() {
  if (!_container || !document.body.contains(_container)) return
  // Guard: don't stomp another view that may now own the container
  if (!_container.querySelector('.dm-layout') && _container.children.length > 0) return
  _container.innerHTML = ''
  if (_rerenderFn) _rerenderFn(_container, getState())
}
