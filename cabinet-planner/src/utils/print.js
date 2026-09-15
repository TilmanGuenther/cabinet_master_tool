/**
 * Print helpers — trigger browser print dialog with appropriate setup.
 */

/**
 * Print the current page. Adds a temporary class to body for CSS targeting.
 * @param {'drawer-map' | 'label-sheet' | 'single-drawer'} mode - which print layout to use
 * @param {object} [options]
 * @param {string} [options.pageSize] - CSS @page size value (e.g. 'A4', 'letter')
 */
export function triggerPrint(mode, options = {}) {
  const { pageSize = 'A4' } = options

  // Inject @page rule to set paper size and suppress browser headers/footers
  const styleEl = document.createElement('style')
  styleEl.id = 'print-page-override'
  styleEl.textContent = `@page { size: ${pageSize} portrait; margin: 15mm; }`
  document.head.appendChild(styleEl)

  document.body.dataset.printMode = mode
  window.print()
  delete document.body.dataset.printMode

  document.head.removeChild(styleEl)
}
