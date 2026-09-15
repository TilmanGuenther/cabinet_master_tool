export function openHelp() {
  if (document.getElementById('help-overlay')) return

  const overlay = document.createElement('div')
  overlay.id = 'help-overlay'
  overlay.className = 'help-overlay'
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeHelp()
  })

  overlay.innerHTML = `
    <div class="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div class="help-header">
        <h2 id="help-title">Cabinet Planner — Help &amp; About</h2>
        <button class="help-close icon-btn" title="Close">✕</button>
      </div>
      <div class="help-body">

        <section class="help-section">
          <h3>About</h3>
          <p>Cabinet Planner is a hardware organisation tool for <strong>LISTA drawer cabinets</strong> with <strong>Gridfinity</strong> modular bins. It runs entirely in your browser — no server, no account required. Export your config as a JSON file to back it up or share it.</p>
        </section>

        <section class="help-section">
          <h3>Views</h3>
          <dl class="help-dl">
            <dt>Configure &rarr; Cabinets</dt>
            <dd>Create and manage cabinets and their drawers. Each drawer has a height (in 7 mm units), a colour, and a name.</dd>

            <dt>Configure &rarr; Drawers</dt>
            <dd>Visually place Gridfinity bins inside a drawer on a grid (42 mm per cell). Drag to draw a new bin, click to select, drag to move. Assign a fastener to each bin from the right panel.</dd>

            <dt>Generate &rarr; Bin Labels</dt>
            <dd>Generate print-ready labels for every bin. Labels include the part description, standards, a side-view icon, and a barcode.</dd>

            <dt>Generate &rarr; Drawer Layouts</dt>
            <dd>Full-scale 1:1 SVG drawer maps you can print and place under your Gridfinity base grid.</dd>

            <dt>Stock &rarr; Prepare</dt>
            <dd>Calculates how many pieces of each fastener to order based on bin volumes, fill percentages, and bulk density. Export the result as a CSV.</dd>

            <dt>&#128190; Data Manager</dt>
            <dd>Import or export your cabinet config JSON, and manage named local snapshots.</dd>
          </dl>
        </section>

        <section class="help-section">
          <h3>Typical Workflow</h3>
          <ol class="help-ol">
            <li>Go to <strong>Configure &rarr; Cabinets</strong> &rarr; add a cabinet, then add drawers to it.</li>
            <li>Go to <strong>Configure &rarr; Drawers</strong> &rarr; select a drawer, draw bins on the grid, assign a fastener to each bin.</li>
            <li>Go to <strong>Generate &rarr; Bin Labels</strong> &rarr; print labels and stick them on the front of each bin.</li>
            <li>Go to <strong>Stock &rarr; Prepare</strong> &rarr; review calculated quantities and export to CSV for purchasing.</li>
            <li>Use the <strong>&#128190; Data Manager</strong> button to export your config as a JSON file for backup.</li>
          </ol>
        </section>

        <section class="help-section">
          <h3>Config JSON</h3>
          <p>All data is stored in a single JSON file. Use the <strong>&#128190; Data Manager</strong> button to import a saved file or export your current state. The file is self-contained and portable &mdash; open it in any browser without a server.</p>
        </section>

        <section class="help-section">
          <h3>Physical Reference</h3>
          <dl class="help-dl">
            <dt>Gridfinity base unit</dt><dd>42 mm × 42 mm</dd>
            <dt>Gridfinity height unit</dt><dd>7 mm</dd>
            <dt>LISTA 75 mm drawer interior</dt><dd>~565 mm × 574 mm → 13 × 13 grid</dd>
          </dl>
        </section>

        <section class="help-section">
          <h3>Thread Colour Convention</h3>
          <ul class="help-thread-list">
            <li><span class="help-swatch" style="background:#93c5fd"></span> M2 — blue</li>
            <li><span class="help-swatch" style="background:#86efac"></span> M2.5 — green</li>
            <li><span class="help-swatch" style="background:#fde68a"></span> M3 — yellow</li>
            <li><span class="help-swatch" style="background:#fca5a5"></span> M4 — red</li>
          </ul>
        </section>

        <section class="help-section">
          <h3>Keyboard Shortcuts — Drawer Map</h3>
          <p>Shortcuts are active in the Drawer Map view when no text field is focused.</p>
          <table class="help-keys">
            <thead><tr><th>Key</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td colspan="2" class="help-keys-group">Selection</td></tr>
              <tr><td><kbd>Shift</kbd>/<kbd>Ctrl</kbd></td><td>Hold and click to multi-select bins</td></tr>
              <tr><td><kbd>Tab</kbd></td><td>Cycle forward through bins in the current drawer</td></tr>
              <tr><td><kbd>Shift</kbd>+<kbd>Tab</kbd></td><td>Cycle backward through bins</td></tr>
              <tr><td><kbd>A</kbd></td><td>Select all bins in the current drawer</td></tr>
              <tr><td><kbd>Esc</kbd></td><td>Deselect all bins</td></tr>

              <tr><td colspan="2" class="help-keys-group">Moving (any selection)</td></tr>
              <tr><td><kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd></td><td>Move selected bin(s) one grid cell</td></tr>

              <tr><td colspan="2" class="help-keys-group">Resizing (single bin selected)</td></tr>
              <tr><td><kbd>Shift</kbd>+<kbd>←/↑/→/↓</kbd></td><td>Expand bin one cell in that direction</td></tr>
              <tr><td><kbd>Ctrl</kbd>+<kbd>←/↑/→/↓</kbd></td><td>Shrink bin one cell from that direction</td></tr>
              <tr><td><kbd>H</kbd></td><td>Increase bin height by one unit</td></tr>
              <tr><td><kbd>Shift</kbd>+<kbd>H</kbd></td><td>Decrease bin height by one unit</td></tr>

              <tr><td colspan="2" class="help-keys-group">Editing (single bin selected)</td></tr>
              <tr><td><kbd>Ctrl</kbd>+<kbd>C</kbd></td><td>Copy bin to clipboard</td></tr>
              <tr><td><kbd>Ctrl</kbd>+<kbd>V</kbd></td><td>Paste copied bin at mouse position</td></tr>
              <tr><td><kbd>Shift</kbd>+<kbd>D</kbd></td><td>Duplicate bin (places copy to the right)</td></tr>
              <tr><td><kbd>Del</kbd> / <kbd>Backspace</kbd></td><td>Delete selected bin(s)</td></tr>

              <tr><td colspan="2" class="help-keys-group">View</td></tr>
              <tr><td><kbd>+</kbd> / <kbd>=</kbd></td><td>Zoom in</td></tr>
              <tr><td><kbd>−</kbd></td><td>Zoom out</td></tr>
              <tr><td><kbd>0</kbd></td><td>Reset zoom to 100 %</td></tr>
              <tr><td><kbd>Space</kbd></td><td>Toggle draw mode on/off</td></tr>
            </tbody>
          </table>
        </section>

      </div>
    </div>
  `

  overlay.querySelector('.help-close').addEventListener('click', closeHelp)
  document.addEventListener('keydown', onEsc)
  document.body.appendChild(overlay)
  overlay.querySelector('.help-close').focus()
}

function closeHelp() {
  const overlay = document.getElementById('help-overlay')
  if (overlay) overlay.remove()
  document.removeEventListener('keydown', onEsc)
}

function onEsc(e) {
  if (e.key === 'Escape') closeHelp()
}
