/**
 * Minimal reactive state manager.
 * Holds the cabinet config and notifies subscribers on change.
 *
 * Auto-save: every state change is persisted to localStorage under STORAGE_KEY.
 * Named saves: user-triggered snapshots stored as an array under SAVES_KEY.
 */

import { createSampleConfig } from './data/sampleConfig.js'

const STORAGE_KEY    = 'cabinet_planner_state'
const AUTOSAVE_TS_KEY = 'cabinet_planner_autosave_ts'
const SAVES_KEY      = 'cabinet_planner_saves'

// ── Storage availability ───────────────────────────────────────────────────────

/** Returns true if localStorage is readable and writable. */
export function isStorageAvailable() {
  try {
    const k = '__cabinet_planner_test__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

// ── Initialisation ─────────────────────────────────────────────────────────────

function loadInitialState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return createSampleConfig()
}

let state = loadInitialState()
const listeners = new Set()

// ── Core state API ─────────────────────────────────────────────────────────────

/** Get the current config state (read-only reference). */
export function getState() {
  return state
}

/** Replace the entire state (e.g. after JSON import or loading a save). */
export function setState(newState) {
  state = newState
  notify()
}

/** Update state via a mutator function: updateState(s => { s.cabinets[0].name = 'X' }) */
export function updateState(fn) {
  fn(state)
  notify()
}

/** Subscribe to state changes. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// ── Auto-save helpers ──────────────────────────────────────────────────────────

/** Returns the Date of the last auto-save, or null if none. */
export function getAutoSaveTimestamp() {
  try {
    const ts = localStorage.getItem(AUTOSAVE_TS_KEY)
    return ts ? new Date(ts) : null
  } catch {
    return null
  }
}

/** Wipe the auto-save and reload so the app starts fresh from sampleConfig. */
export function clearAutoSave() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(AUTOSAVE_TS_KEY)
  } catch {}
}

// ── Named saves API ────────────────────────────────────────────────────────────

/** Returns the array of named saves, newest first. */
export function getSaves() {
  try {
    const raw = localStorage.getItem(SAVES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Snapshot the current state under a user-supplied name.
 * Returns true on success, false if storage is full or unavailable.
 */
export function createSave(name) {
  try {
    const saves = getSaves()
    const id = `save-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    saves.unshift({
      id,
      name,
      savedAt: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(state)), // deep clone
    })
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves))
    return true
  } catch {
    return false
  }
}

/** Load a named save by id, replacing the current state. */
export function loadSave(id) {
  const save = getSaves().find(s => s.id === id)
  if (save) setState(save.state)
}

/** Delete a named save by id. */
export function deleteSave(id) {
  try {
    const saves = getSaves().filter(s => s.id !== id)
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves))
  } catch {}
}

// ── Internal ───────────────────────────────────────────────────────────────────

function notify() {
  for (const fn of listeners) fn(state)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    localStorage.setItem(AUTOSAVE_TS_KEY, new Date().toISOString())
  } catch {}
}
