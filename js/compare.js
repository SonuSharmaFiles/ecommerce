// Compare page — renders a side-by-side table of selected products
document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("compare-root");
  const summary = document.getElementById("compare-summary");
  if (!root) return;

  async function render() {
    const ids = Compare.get();
    if (ids.length === 0) {
      summary.textContent = "0 products selected.";
      root.innerHTML = `<div class="compare-empty">
        <h2>Nothing to compare yet</h2>
        <p>Hover over any product card and tick "Compare" to add it here.</p>
        <a href="products.html" class="btn btn-primary" style="margin-top:12px">Browse products</a>
      </div>`;
      return;
    }

    let products;
    try { products = await loadProducts(); }
    catch { root.innerHTML = `<p class="text-muted">Could not load products.</p>`; return; }

    const items = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
    summary.innerHTML = `${items.length} product${items.length === 1 ? "" : "s"} selected. <button class="btn btn-ghost btn-sm" id="clear-cmp">Clear all</button>`;

    // Collect all spec names across products
    const allSpecNames = new Set();
    items.forEach((p) => (p.specs || []).forEach((s) => allSpecNames.add(s.name)));

    root.innerHTML = `
      <table class="compare-table">
        <tbody>
          <tr>
            <th></th>
            ${items.map((p) => `<td>
              <a href="product.html?id=${p.id}"><img src="${productImage(p)}" alt="${escapeHtml(p.title)}"/></a>
              <button class="btn btn-ghost btn-sm" data-compare-remove="${p.id}" style="margin-top:8px;color:var(--ink-soft)">Remove</button>
            </td>`).join("")}
          </tr>
          <tr>
            <th>Product</th>
            ${items.map((p) => `<td class="compare-product-title">
              <a href="product.html?id=${p.id}" class="link">${escapeHtml(p.title)}</a>
              <div class="text-muted" style="font-size:12px;margin-top:4px">${escapeHtml(p.brand)} · ${escapeHtml(p.category)}</div>
            </td>`).join("")}
          </tr>
          <tr class="compare-price-row">
            <th>Price</th>
            ${items.map((p) => `<td>
              ${formatPrice(p.price)}
              ${p.compare_at ? `<span class="price-old" style="margin-left:6px">${formatPrice(p.compare_at)}</span>` : ""}
            </td>`).join("")}
          </tr>
          <tr>
            <th>Rating</th>
            ${items.map((p) => {
              const stats = effectiveStats(p);
              return `<td>${ratingStars(stats.rating, 14)} <span style="font-size:13px;margin-left:4px">${stats.rating.toFixed(1)} (${stats.count})</span></td>`;
            }).join("")}
          </tr>
          <tr>
            <th>Availability</th>
            ${items.map((p) => `<td>${p.in_stock ? '<span class="stock-pill in">● In stock</span>' : '<span class="stock-pill out">● Out of stock</span>'}</td>`).join("")}
          </tr>
          ${[...allSpecNames].map((name) => `
            <tr>
              <th>${escapeHtml(name)}</th>
              ${items.map((p) => {
                const spec = (p.specs || []).find((s) => s.name === name);
                return `<td>${spec ? escapeHtml(spec.value) : '<span class="text-muted">—</span>'}</td>`;
              }).join("")}
            </tr>
          `).join("")}
          <tr>
            <th></th>
            ${items.map((p) => `<td>
              <button class="btn btn-primary btn-sm" data-add="${p.id}" ${p.in_stock ? "" : "disabled"}>Add to cart</button>
            </td>`).join("")}
          </tr>
        </tbody>
      </table>
    `;
  }

  await render();
  document.addEventListener("compare:changed", render);
  document.addEventListener("click", (e) => {
    if (e.target.id === "clear-cmp") { Compare.clear(); render(); }
  });
});
