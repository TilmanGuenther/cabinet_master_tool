import changelog from '../data/changelog.json'

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

function renderChangelog() {
  return changelog.map(entry => `
    <div class="home-news-entry">
      <div class="home-news-meta">
        <span class="home-news-version">v${esc(entry.version)}</span>
        <span class="home-news-date">${esc(entry.date)}</span>
      </div>
      <ul class="home-news-list">
        ${entry.changes.map(c => `<li>${esc(c)}</li>`).join('')}
      </ul>
    </div>
  `).join('')
}

export function renderHome(container) {
  container.innerHTML = `
    <div class="home-view">
      <div class="home-hero">
        <div class="home-logo">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="8" width="48" height="40" rx="3" stroke="currentColor" stroke-width="2.5" fill="none"/>
            <rect x="4" y="8" width="48" height="12" rx="3" stroke="currentColor" stroke-width="2.5" fill="none"/>
            <rect x="4" y="20" width="48" height="12" stroke="currentColor" stroke-width="2.5" fill="none"/>
            <rect x="4" y="32" width="48" height="16" rx="0" stroke="currentColor" stroke-width="2.5" fill="none" style="border-bottom-left-radius:3px;border-bottom-right-radius:3px"/>
            <circle cx="28" cy="14" r="2" fill="currentColor"/>
            <circle cx="28" cy="26" r="2" fill="currentColor"/>
            <circle cx="28" cy="40" r="2" fill="currentColor"/>
          </svg>
        </div>
        <h1 class="home-title">Cabinet Planner</h1>
        <p class="home-subtitle">Software to realize standard parts organization in drawer cabinets with Gridfinity bins.</p>
      </div>

      <div class="home-cards">
        <div class="home-card" data-nav="cabinets">
          <div class="home-card-icon">&#9881;</div>
          <div class="home-card-body">
            <h3>Configure Cabinets</h3>
            <p>Add your cabinets and define each drawer's height, color, and label.</p>
          </div>
          <span class="home-card-arrow">&#8594;</span>
        </div>

        <div class="home-card" data-nav="drawers">
          <div class="home-card-icon">&#9635;</div>
          <div class="home-card-body">
            <h3>Map Drawers</h3>
            <p>Drag and place Gridfinity bins on an interactive grid and assign fastener parts.</p>
          </div>
          <span class="home-card-arrow">&#8594;</span>
        </div>

        <div class="home-card" data-nav="labels">
          <div class="home-card-icon">&#128204;</div>
          <div class="home-card-body">
            <h3>Generate Labels</h3>
            <p>Print label sheets with fastener icons and barcodes</p>
          </div>
          <span class="home-card-arrow">&#8594;</span>
        </div>

        <div class="home-card" data-nav="poster">
          <div class="home-card-icon">&#128196;</div>
          <div class="home-card-body">
            <h3>Drawer Layouts</h3>
            <p>Print full-scale 1:1 drawer maps to place under your Gridfinity base grid.</p>
          </div>
          <span class="home-card-arrow">&#8594;</span>
        </div>

        <div class="home-card" data-nav="prepare">
          <div class="home-card-icon">&#128203;</div>
          <div class="home-card-body">
            <h3>Prepare Stock</h3>
            <p>Calculate target quantities from bin volumes and export order lists.</p>
          </div>
          <span class="home-card-arrow">&#8594;</span>
        </div>

        <div class="home-card" data-nav="data">
          <div class="home-card-icon">&#128190;</div>
          <div class="home-card-body">
            <h3>Import &amp; Export</h3>
            <p>Load a cabinet config JSON, save named snapshots, or export your current layout.</p>
          </div>
          <span class="home-card-arrow">&#8594;</span>
        </div>
      </div>

      <div class="home-news">
        <h2 class="home-news-title">What&rsquo;s New</h2>
        <div class="home-news-entries">
          ${renderChangelog()}
        </div>
      </div>
    </div>
  `

  container.querySelectorAll('.home-card[data-nav]').forEach(card => {
    card.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('navigate', { detail: card.dataset.nav }))
    })
  })
}
