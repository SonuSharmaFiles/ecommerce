// Catalog: search, filter, sort, paginate
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("catalog-grid");
  const sidebar = document.getElementById("filter-panel");
  const toolbar = document.getElementById("catalog-toolbar");
  if (!grid) return;

  let all = [];
  try {
    all = await loadProducts();
  } catch {
    grid.innerHTML = `<p class="text-muted">Could not load products.</p>`;
    return;
  }

  const PER_PAGE = 8;
  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get("q") || "",
    categories: new Set((params.get("category") || "").split(",").filter(Boolean)),
    brands: new Set((params.get("brand") || "").split(",").filter(Boolean)),
    minPrice: Number(params.get("min")) || null,
    maxPrice: Number(params.get("max")) || null,
    sort: params.get("sort") || "featured",
    page: Math.max(1, Number(params.get("page")) || 1),
  };

  const cats = [...new Set(all.map((p) => p.category))];
  const brands = [...new Set(all.map((p) => p.brand))];
  const prices = all.map((p) => p.price);
  const priceMin = Math.floor(Math.min(...prices));
  const priceMax = Math.ceil(Math.max(...prices));

  sidebar.innerHTML = `
    <div class="filter-block">
      <h3 class="filter-title">Categories</h3>
      ${cats.map((c) => `
        <div class="filter-option">
          <input type="checkbox" id="cat-${c}" value="${escapeHtml(c)}" ${state.categories.has(c) ? "checked" : ""} data-filter="category"/>
          <label for="cat-${c}">${escapeHtml(c)}</label>
        </div>`).join("")}
    </div>
    <div class="filter-block">
      <h3 class="filter-title">Brands</h3>
      ${brands.map((b) => `
        <div class="filter-option">
          <input type="checkbox" id="brand-${b}" value="${escapeHtml(b)}" ${state.brands.has(b) ? "checked" : ""} data-filter="brand"/>
          <label for="brand-${b}">${escapeHtml(b)}</label>
        </div>`).join("")}
    </div>
    <div class="filter-block">
      <h3 class="filter-title">Price</h3>
      <div class="price-range">
        <input type="number" id="price-min" placeholder="${priceMin}" value="${state.minPrice ?? ""}" />
        <span>–</span>
        <input type="number" id="price-max" placeholder="${priceMax}" value="${state.maxPrice ?? ""}" />
      </div>
      <button class="btn btn-outline btn-sm" style="margin-top:12px" id="apply-price">Apply</button>
    </div>
    <button class="btn btn-ghost btn-sm" id="clear-filters">Clear all</button>
  `;

  toolbar.innerHTML = `
    <div class="search-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="search" id="catalog-search" placeholder="Search products…" value="${escapeHtml(state.q)}"/>
    </div>
    <select class="sort-select" id="catalog-sort">
      <option value="featured" ${state.sort === "featured" ? "selected" : ""}>Featured</option>
      <option value="price_asc" ${state.sort === "price_asc" ? "selected" : ""}>Price: Low to High</option>
      <option value="price_desc" ${state.sort === "price_desc" ? "selected" : ""}>Price: High to Low</option>
      <option value="rating" ${state.sort === "rating" ? "selected" : ""}>Top Rated</option>
      <option value="newest" ${state.sort === "newest" ? "selected" : ""}>Newest</option>
    </select>
  `;

  function filtered() {
    let list = all.slice();
    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.short || "").toLowerCase().includes(q)
      );
    }
    if (state.categories.size > 0) list = list.filter((p) => state.categories.has(p.category));
    if (state.brands.size > 0) list = list.filter((p) => state.brands.has(p.brand));
    if (state.minPrice != null) list = list.filter((p) => p.price >= state.minPrice);
    if (state.maxPrice != null) list = list.filter((p) => p.price <= state.maxPrice);
    switch (state.sort) {
      case "price_asc": list.sort((a, b) => a.price - b.price); break;
      case "price_desc": list.sort((a, b) => b.price - a.price); break;
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
      case "newest": list.sort((a, b) => Number(b.badges?.includes("new")) - Number(a.badges?.includes("new"))); break;
      default: list.sort((a, b) => Number(b.badges?.includes("featured")) - Number(a.badges?.includes("featured")));
    }
    return list;
  }

  function render() {
    const list = filtered();
    const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * PER_PAGE;
    const slice = list.slice(start, start + PER_PAGE);

    grid.innerHTML = slice.length
      ? slice.map(productCardHTML).join("")
      : `<div class="empty-state" style="grid-column:1/-1">
           <h2>No results</h2>
           <p>Try removing some filters or searching for something else.</p>
         </div>`;
    document.getElementById("catalog-count").textContent =
      `${list.length} ${list.length === 1 ? "product" : "products"}`;

    // Pagination
    const pag = document.getElementById("pagination");
    if (totalPages > 1) {
      const pages = [];
      pages.push(`<button data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>‹ Prev</button>`);
      for (let i = 1; i <= totalPages; i++) {
        pages.push(`<button class="${i === state.page ? "active" : ""}" data-page="${i}">${i}</button>`);
      }
      pages.push(`<button data-page="${state.page + 1}" ${state.page === totalPages ? "disabled" : ""}>Next ›</button>`);
      pag.innerHTML = pages.join("");
    } else {
      pag.innerHTML = "";
    }
  }

  function updateUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.categories.size) p.set("category", [...state.categories].join(","));
    if (state.brands.size) p.set("brand", [...state.brands].join(","));
    if (state.minPrice != null) p.set("min", state.minPrice);
    if (state.maxPrice != null) p.set("max", state.maxPrice);
    if (state.sort !== "featured") p.set("sort", state.sort);
    if (state.page !== 1) p.set("page", state.page);
    const q = p.toString();
    history.replaceState(null, "", q ? "?" + q : location.pathname);
  }

  sidebar.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-filter=category]")) {
      t.checked ? state.categories.add(t.value) : state.categories.delete(t.value);
    } else if (t.matches("[data-filter=brand]")) {
      t.checked ? state.brands.add(t.value) : state.brands.delete(t.value);
    }
    state.page = 1;
    render(); updateUrl();
  });
  sidebar.querySelector("#apply-price").addEventListener("click", () => {
    const min = sidebar.querySelector("#price-min").value;
    const max = sidebar.querySelector("#price-max").value;
    state.minPrice = min === "" ? null : Number(min);
    state.maxPrice = max === "" ? null : Number(max);
    state.page = 1;
    render(); updateUrl();
  });
  sidebar.querySelector("#clear-filters").addEventListener("click", () => {
    location.search = "";
  });

  toolbar.querySelector("#catalog-search").addEventListener("input", (e) => {
    state.q = e.target.value; state.page = 1; render(); updateUrl();
  });
  toolbar.querySelector("#catalog-sort").addEventListener("change", (e) => {
    state.sort = e.target.value; state.page = 1; render(); updateUrl();
  });
  document.getElementById("pagination").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-page]");
    if (!btn || btn.disabled) return;
    state.page = Number(btn.dataset.page);
    render(); updateUrl();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Pre-fill search from header search if present
  const headerQ = new URLSearchParams(location.search).get("q");
  if (headerQ && !state.q) {
    state.q = headerQ;
    toolbar.querySelector("#catalog-search").value = headerQ;
  }

  render();

  // ItemList JSON-LD for SEO — lists every product in the catalog
  const itemListLd = document.createElement("script");
  itemListLd.type = "application/ld+json";
  itemListLd.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "ShopFlow products",
    itemListElement: all.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://sonusharmafiles.github.io/ecommerce/product.html?id=${p.id}`,
      name: p.title,
    })),
  });
  document.head.appendChild(itemListLd);
});
