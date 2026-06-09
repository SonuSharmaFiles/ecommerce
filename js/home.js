// Home page logic — featured/best/new sections + categories
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const products = await loadProducts();
    window._productsCache = Promise.resolve(products);

    const featured = products.filter((p) => p.badges?.includes("featured")).slice(0, 4);
    const bestSellers = products.filter((p) => p.badges?.includes("best_seller")).slice(0, 4);
    const newArrivals = products.filter((p) => p.badges?.includes("new")).slice(0, 4);
    const onSale = products.filter((p) => p.compare_at && p.compare_at > p.price).slice(0, 4);

    const slots = [
      ["featured-grid", featured],
      ["bestsellers-grid", bestSellers],
      ["new-grid", newArrivals],
      ["deals-grid", onSale],
    ];
    slots.forEach(([id, list]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = list.length
        ? list.map(productCardHTML).join("")
        : `<p class="text-muted">No items.</p>`;
    });

    // Categories row
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
  } catch (e) {
    console.error(e);
    toast("Could not load products");
  }
});
