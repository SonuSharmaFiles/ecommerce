// Home page logic
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const products = await loadProducts();
    const featured = products.filter((p) => p.badges?.includes("featured")).slice(0, 4);
    const bestSellers = products.filter((p) => p.badges?.includes("best_seller")).slice(0, 4);
    const newArrivals = products.filter((p) => p.badges?.includes("new")).slice(0, 4);
    const onSale = products.filter((p) => p.compare_at && p.compare_at > p.price).slice(0, 4);

    [
      ["featured-grid", featured],
      ["bestsellers-grid", bestSellers],
      ["new-grid", newArrivals],
      ["deals-grid", onSale],
    ].forEach(([id, list]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = list.length ? list.map(productCardHTML).join("") : `<p class="text-muted">No items.</p>`;
    });

    // Categories
    const categories = [...new Set(products.map((p) => p.category))];
    const catGrid = document.getElementById("categories-row");
    if (catGrid) {
      catGrid.innerHTML = categories.map((c) => {
        const sample = products.find((p) => p.category === c);
        return `
          <a class="category-card" href="products.html?category=${encodeURIComponent(c)}">
            <img src="${sample ? productImage(sample) : ""}" alt="${escapeHtml(c)}" loading="lazy"/>
            <span class="label">${escapeHtml(c)}</span>
          </a>
        `;
      }).join("");
    }

    // Recently viewed
    const recentIds = Recent.get();
    const recent = recentIds.map((id) => products.find((p) => p.id === id)).filter(Boolean);
    const recentEl = document.getElementById("recent-grid");
    const recentSection = document.getElementById("recent-section");
    if (recentEl) {
      if (recent.length > 0) {
        recentEl.innerHTML = recent.slice(0, 4).map(productCardHTML).join("");
      } else if (recentSection) {
        recentSection.style.display = "none";
      }
    }

    // Sale countdown — set to midnight tonight
    const cd = document.getElementById("countdown");
    if (cd) {
      const target = new Date();
      target.setHours(23, 59, 59, 999);
      function tick() {
        const ms = target - new Date();
        if (ms <= 0) { cd.textContent = "Sale ended"; return; }
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        cd.innerHTML = `<span>${String(h).padStart(2,"0")}h</span><span>${String(m).padStart(2,"0")}m</span><span>${String(s).padStart(2,"0")}s</span>`;
      }
      tick();
      setInterval(tick, 1000);
    }
  } catch (e) {
    console.error(e);
    toast("Could not load products");
  }
});
