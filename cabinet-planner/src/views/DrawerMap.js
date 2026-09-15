/**
 * Drawer Map — interactive 3-panel editor.
 *  Left:   cabinet / drawer navigation (visual cabinet diagram)
 *  Middle: grid workspace (drag-to-create bins, drag-to-move bins)
 *  Right:  selected bin properties
 *
 * This file is the thin orchestrator. The implementation is split across:
 *   drawerMap/dmConstants.js  — pure constant data
 *   drawerMap/dmHelpers.js    — pure utility + DB query helpers
 *   drawerMap/dmState.js      — module-level mutable state + rerender
 *   drawerMap/dmKeybinds.js   — keyboard shortcuts
 *   drawerMap/dmPanels.js     — buildNav, buildWorkspace, buildProperties
 */

import {
  setContainer, setRerenderListener, getRerenderListener, setRerenderFn,
  getSelDrawerId, setSelDrawerId, getSelBinIds,
  rerender,
} from './drawerMap/dmState.js'
import { setupKeybinds } from './drawerMap/dmKeybinds.js'
import { buildNav, buildWorkspace, buildProperties } from './drawerMap/dmPanels.js'
import { mk } from './drawerMap/dmHelpers.js'

// ── Main export ───────────────────────────────────────────────────────────────

export function jumpToDrawer(id) { _selDrawerId = id }

export function renderDrawerMap(container, state) {
  setContainer(container)
  setRerenderFn(renderDrawerMap)

  // Swap selection-change listener
  const prevListener = getRerenderListener()
  if (prevListener) document.removeEventListener('dm-rerender', prevListener)
  setRerenderListener(rerender)
  document.addEventListener('dm-rerender', rerender)

  setupKeybinds()

  // Validate / initialise selection
  const allDrawers = (state.cabinets || []).flatMap(c => c.drawers || [])
  if (getSelDrawerId() && !allDrawers.find(d => d.id === getSelDrawerId())) {
    setSelDrawerId(null)
    getSelBinIds().clear()
  }
  if (!getSelDrawerId() && allDrawers.length > 0) setSelDrawerId(allDrawers[0].id)

  const layout = mk('div', 'dm-layout')

  const navPanel   = mk('div', 'dm-panel dm-nav')
  const workPanel  = mk('div', 'dm-panel dm-workspace')
  const propsPanel = mk('div', 'dm-panel dm-properties')

  buildNav(navPanel, state)
  buildWorkspace(workPanel, state)
  buildProperties(propsPanel, state)

  layout.append(navPanel, workPanel, propsPanel)
  container.appendChild(layout)
}
