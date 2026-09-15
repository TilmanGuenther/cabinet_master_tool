export function renderStockOrder(container) {
  container.innerHTML = `
    <div class="placeholder-view">
      <div class="placeholder-icon">&#128666;</div>
      <h2 class="placeholder-title">Order</h2>
      <p class="placeholder-desc">
        This section will let you send your reorder list directly to a supplier or generate
        a purchase order document from the quantities calculated in <em>Prepare</em>.
      </p>
      <span class="placeholder-badge">Coming soon</span>
    </div>
  `
}
