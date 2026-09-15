import './style.css'
import { renderHome }              from './views/Home.js'
import { renderSetup }             from './views/Setup.js'
import { renderDrawerMap }         from './views/DrawerMap.js'
import { renderBinModels }         from './views/BinModels.js'
import { renderLabelSheet }        from './views/LabelSheet.js'
import { renderBinLocationPoster } from './views/BinLocationPoster.js'
import { renderOrderList }         from './views/OrderList.js'
import { renderStockOrder }        from './views/StockOrder.js'
import { renderDataManager }       from './views/DataManager.js'
import { openHelp }                from './views/Help.js'
import { getState, subscribe }     from './state.js'
import changelog                   from './data/changelog.json'

// === Theme management ===
const THEME_KEY = 'cabinet-planner-theme'

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') {
    applyTheme(stored)
  } else {
    applyTheme('light')
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || getSystemTheme()
  const next = current === 'dark' ? 'light' : 'dark'
  localStorage.setItem(THEME_KEY, next)
  applyTheme(next)
  updateThemeBtn()
}

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || getSystemTheme()
}

function updateThemeBtn() {
  const btn = document.getElementById('theme-toggle-btn')
  if (!btn) return
  const isDark = getCurrentTheme() === 'dark'
  btn.textContent = isDark ? '☀' : '☾'
  btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode'
}

initTheme()

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!localStorage.getItem(THEME_KEY)) updateThemeBtn()
})

// === Views & Navigation ===

const views = {
  home:        { label: 'Home',            render: renderHome },
  cabinets:    { label: 'Cabinets',        render: renderSetup },
  drawers:     { label: 'Drawers',         render: renderDrawerMap },
  'bin-models':{ label: 'Bin Models',      render: renderBinModels },
  labels:      { label: 'Bin Labels',      render: renderLabelSheet },
  poster:      { label: 'Drawer Layouts',  render: renderBinLocationPoster },
  prepare:     { label: 'Prepare',         render: renderOrderList },
  'stock-order':{ label: 'Order',          render: renderStockOrder },
  data:        { label: 'Data',            render: renderDataManager },
}

// Nav group definitions — order matters for rendering
const NAV_GROUPS = [
  { label: 'Configure', slug: 'configure', items: ['cabinets', 'drawers'] },
  { label: 'Generate',  slug: 'generate',  items: ['bin-models', 'labels', 'poster'] },
  { label: 'Stock',     slug: 'stock',     items: ['prepare', 'stock-order'] },
]

let currentView = 'home'

function updateTitleState() {
  const title = document.getElementById('app-title')
  if (!title) return
  title.classList.toggle('app-title--active', currentView === 'home')
}

function renderNav() {
  const nav = document.getElementById('main-nav')
  nav.innerHTML = ''

  for (const group of NAV_GROUPS) {
    const groupEl = document.createElement('div')
    groupEl.className = `nav-group nav-group--${group.slug}`

    const labelEl = document.createElement('span')
    labelEl.className = 'nav-group-label'
    labelEl.textContent = group.label
    groupEl.appendChild(labelEl)

    const btnsEl = document.createElement('div')
    btnsEl.className = 'nav-group-buttons'

    for (const key of group.items) {
      const btn = document.createElement('button')
      btn.textContent = views[key].label
      btn.className = key === currentView ? 'nav-btn active' : 'nav-btn'
      btn.addEventListener('click', () => switchView(key))
      btnsEl.appendChild(btn)
    }

    groupEl.appendChild(btnsEl)
    nav.appendChild(groupEl)
  }

  // Data Manager button (right-aligned)
  const dataBtn = document.createElement('button')
  dataBtn.className = currentView === 'data' ? 'nav-btn nav-btn-data active' : 'nav-btn nav-btn-data'
  dataBtn.innerHTML = '&#128190;'
  dataBtn.title = 'Import / Export / Saves'
  dataBtn.setAttribute('aria-label', 'Data Manager')
  dataBtn.addEventListener('click', () => switchView('data'))
  nav.appendChild(dataBtn)

  updateTitleState()
}

function switchView(key) {
  currentView = key
  renderNav()
  renderCurrentView()
}

function renderCurrentView() {
  const container = document.getElementById('view-container')
  container.innerHTML = ''
  views[currentView].render(container, getState())
}

// Re-render when state changes
subscribe(() => {
  renderNav()
  renderCurrentView()
})

// Allow views to navigate between tabs
document.addEventListener('navigate', (e) => switchView(e.detail))

function openLicensePopup() {
  const existing = document.getElementById('license-overlay')
  if (existing) return

  const overlay = document.createElement('div')
  overlay.id = 'license-overlay'
  overlay.className = 'help-overlay'
  overlay.innerHTML = `
    <div class="help-dialog" role="dialog" aria-modal="true" aria-labelledby="license-title">
      <div class="help-header">
        <h2 id="license-title">License — AGPL-3.0</h2>
        <button class="help-close btn" id="license-close-btn" title="Close">&times;</button>
      </div>
      <div class="help-body">
        <div class="help-body">
          <h3> Cabinet Planner</h3>
          <p> A software for creating fastener organization gridfinity in cabinet drawers.</p>
          <p> Copyright © 2026 Tilman Guenther </p>
          <p> This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or any later version.
          <p> This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.</p>
          <p> You should have received a copy of the GNU Affero General Public License along with this program.  If not, see https://www.gnu.org/licenses/.</p>
        </div>
        <div class="help-section">
          <h3>What it means and what it does</h3>
          <p>AGPL means that the software is open source. You, or anyone, can use, copy, modify, and distribute the code as you see fit. That said, unlike MIT licenses, "GPL" licenses are copy-left, meaning that any branches, copies, or similar must also carry this same licensing. AGPL, unlike regular GPL, also has provisions against SaaS nonsense.</p>
        </div>
        <div class="help-section">
          <h3>Why AGPL specifically</h3>
          <p>I am fine with my software being used by anyone, but what I don't want is "corporate capture" where a FOSS project gets forked by a company, modified slightly, and then sold for profit without giving back to the community; e.g. in the form of contributions to the project. I feel this fundamentally defeats the purpose of the FOSS spirit, especially for projects like this one.</p>
        </div>
      </div>
    </div>
  `

  let escHandler = null
  const close = () => {
    overlay.remove()
    if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null }
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#license-close-btn').addEventListener('click', close)
  escHandler = (e) => { if (e.key === 'Escape') close() }
  document.addEventListener('keydown', escHandler)

  document.body.appendChild(overlay)
}

function openAiDisclaimerPopup() {
  const existing = document.getElementById('ai-disclaimer-overlay')
  if (existing) return

  const overlay = document.createElement('div')
  overlay.id = 'ai-disclaimer-overlay'
  overlay.className = 'help-overlay'
  overlay.innerHTML = `
    <div class="help-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-disclaimer-title">
      <div class="help-header">
        <h2 id="ai-disclaimer-title">AI Use Disclaimer</h2>
        <button class="help-close btn" id="ai-disclaimer-close-btn" title="Close">&times;</button>
      </div>
      <div class="help-body">
        <div class="help-section">
          <p>As of writing, the overwhelming majority of code within this project was generated using agentic generative LLM technology, specifically using Anthropic's "Claude Code" wrapper of the Sonnet 4.6 model.</p>
        </div>
        <div class="help-section">
          <h3>Why use AI?</h3>
          <p>Frankly, without AI, this project would not exist. The need this project was made to address is real (creating an organizer of small fasteners), but without AI, it likely would've ended up being a one-shot python script to automatically generate a bunch of labels for bins, and then promptly be forgotten to never be used again, effectively "wasted" time collecting virtual dust in a subdirectory somewhere. Nobody else would ever be able to use it, and even if I were to publish it, the intent behind the software would've been too convoluted to have reasonable reuse potential.</p>
          <p>With generative AI, which puts me into a "project manager" role, I'm able to create this project in the way that I envision it, in so little time that it's "worth the investment". The justification I used was "I could manually code a specific solution for my problem in X hours OR I could use AI to create a shareable generic solution to the problem I'm facing in the same X hours". Obviously, in this case, I chose the second option, because I think that by creating something that others might enjoy, find useful, and save them time, I can make the world a better place in a very small way.</p>
        </div>
        <div class="help-section">
          <h3>The Environmental Impact of AI</h3>
          <p>The effect that training models has on the environment is non-negligible, as significant energy expenditures and human-FTEs are required to run the server farms, write the code, etc. That said, "in the real world", people make choices to spend energy on things all the time, and my thinking here is because the "tokens" aren't being spent for a frivolous purpose, there is a very good chance that this project pays for its own carbon debt as it accelerates me (and others) finding the right parts in the workshop quickly, thus speeding up engineering. For example, if the organizer that I setup using this code results in 60 seconds saved looking for a specific part per day per person, and 10 people are using it actively, that can really snowball into a large effect.</p>
        </div>
      </div>
    </div>
  `

  let escHandler = null
  const close = () => {
    overlay.remove()
    if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null }
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#ai-disclaimer-close-btn').addEventListener('click', close)
  escHandler = (e) => { if (e.key === 'Escape') close() }
  document.addEventListener('keydown', escHandler)

  document.body.appendChild(overlay)
}

// Wire up footer elements after DOM is ready
function initFooter() {
  const latestVersion = changelog[0]?.version
  if (latestVersion) {
    const versionEl = document.querySelector('.footer-version')
    if (versionEl) versionEl.textContent = `v${latestVersion}`
  }

  const themeBtn = document.getElementById('theme-toggle-btn')
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme)
    updateThemeBtn()
  }

  const helpLink = document.getElementById('footer-help-link')
  if (helpLink) {
    helpLink.addEventListener('click', (e) => {
      e.preventDefault()
      openHelp()
    })
  }

  const licenseLink = document.getElementById('footer-license-link')
  if (licenseLink) {
    licenseLink.addEventListener('click', (e) => {
      e.preventDefault()
      openLicensePopup()
    })
  }

  const aiDisclaimerLink = document.getElementById('footer-ai-disclaimer-link')
  if (aiDisclaimerLink) {
    aiDisclaimerLink.addEventListener('click', (e) => {
      e.preventDefault()
      openAiDisclaimerPopup()
    })
  }

  const appTitle = document.getElementById('app-title')
  if (appTitle) {
    appTitle.addEventListener('click', () => switchView('home'))
  }
}

// Initial render
renderNav()
renderCurrentView()
initFooter()
