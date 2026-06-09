// Wishlist page
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("wishlist-grid");
  const empty = document.getElementById("wishlist-empty");
  if (!grid) return;

  const ids = Wishlist.get();
  if (ids.length === 0) {
    grid.style.display = "none"; empty.hidden = false; return;
  }

  try {
    const products = await loadProducts();
    const list = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
    grid.innerHTML = list.map(productCardHTML).join("");

    document.addEventListener("wishlist:changed", () => {
      const updated = Wishlist.get();
      if (updated.length === 0) { grid.style.display = "none"; empty.hidden = false; }
    });
  } catch {
    grid.innerHTML = `<p class="text-muted">Could not load products.</p>`;
  }
});
