// Product detail page
document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("detail-root");
  if (!root) return;

  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    root.innerHTML = `<div class="empty-state"><h2>No product specified</h2><p><a class="link" href="products.html">Back to catalog</a></p></div>`;
    return;
  }

  let products;
  try {
    products = await loadProducts();
    window._productsCache = Promise.resolve(products);
  } catch {
    root.innerHTML = `<p class="text-muted">Could not load products.</p>`;
    return;
  }

  const p = products.find((x) => x.id === id);
  if (!p) {
    root.innerHTML = `<div class="empty-state"><h2>Product not found</h2><p><a class="link" href="products.html">Back to catalog</a></p></div>`;
    return;
  }

  document.title = `${p.title} — ShopFlow`;
  const disc = discountPercent(p);
  const inWishlist = Wishlist.has(p.id);
  const images = p.images && p.images.length ? p.images : [p.image];

  // Breadcrumbs
  document.getElementById("crumbs").innerHTML = `
    <a href="index.html">Home</a><span class="sep">/</span>
    <a href="products.html">Shop</a><span class="sep">/</span>
    <a href="products.html?category=${encodeURIComponent(p.category)}">${escapeHtml(p.category)}</a>
    <span class="sep">/</span><span>${escapeHtml(p.title)}</span>
  `;

  root.innerHTML = `
    <div class="gallery">
      <div class="gallery-main"><img id="main-img" src="${images[0]}" alt="${escapeHtml(p.title)}"/></div>
      <div class="gallery-thumbs">
        ${images.map((src, i) => `
          <button data-img="${i}" class="${i === 0 ? "active" : ""}">
            <img src="${src}" alt="${escapeHtml(p.title)} ${i+1}"/>
          </button>
        `).join("")}
      </div>
    </div>

    <div class="detail-info">
      <div class="product-meta">${escapeHtml(p.brand)} · ${escapeHtml(p.category)}</div>
      <h1>${escapeHtml(p.title)}</h1>
      <div class="detail-rating">
        ${ratingStars(p.rating)}
        <span>${p.rating.toFixed(1)} · ${p.ratings_count} reviews</span>
      </div>
      <div class="detail-price">
        ${formatPrice(p.price)}
        ${p.compare_at ? `<span class="price-old">${formatPrice(p.compare_at)}</span>` : ""}
        ${disc > 0 ? `<span class="badge sale" style="margin-left:8px">-${disc}%</span>` : ""}
      </div>
      <p class="detail-short">${escapeHtml(p.short || "")}</p>
      <div>
        <span class="stock-pill ${p.in_stock ? "in" : "out"}">
          ${p.in_stock ? "● In stock" : "● Out of stock"}
        </span>
        ${p.in_stock ? `<span class="text-muted" style="margin-left:8px;font-size:13px">Ships within 1–3 business days</span>` : ""}
      </div>
      <div class="detail-actions">
        <button class="btn btn-primary btn-lg" id="dt-add" ${p.in_stock ? "" : "disabled"}>
          ${p.in_stock ? "Add to cart" : "Out of stock"}
        </button>
        <button class="btn btn-outline btn-lg ${inWishlist ? "active" : ""}" id="dt-wish" data-wishlist="${p.id}">
          ${inWishlist ? "♥ Saved" : "♡ Save"}
        </button>
      </div>
      <div class="detail-perks">
        <div class="detail-perk">🚚 Free over $75</div>
        <div class="detail-perk">🔒 Secure checkout</div>
        <div class="detail-perk">↩ 30-day returns</div>
      </div>
    </div>

    <div class="detail-tabs" style="grid-column:1/-1">
      <div class="tab-buttons">
        <button class="tab-button active" data-tab="desc">Description</button>
        <button class="tab-button" data-tab="specs">Specifications</button>
        <button class="tab-button" data-tab="reviews">Reviews</button>
      </div>
      <div class="tab-panel active" data-panel="desc">
        <p>${escapeHtml(p.description || p.short || "")}</p>
      </div>
      <div class="tab-panel" data-panel="specs">
        <table class="specs-table">
          ${(p.specs || []).map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.value)}</td></tr>`).join("")}
        </table>
      </div>
      <div class="tab-panel" data-panel="reviews">
        <p class="text-muted">${p.ratings_count} customer reviews · average ${p.rating.toFixed(1)} / 5</p>
      </div>
    </div>
  `;

  // Gallery click
  root.querySelectorAll("[data-img]").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll("[data-img]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("main-img").src = images[Number(btn.dataset.img)];
    });
  });

  // Tabs
  root.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      root.querySelectorAll(".tab-panel").forEach((pn) => pn.classList.remove("active"));
      root.querySelector(`[data-panel=${btn.dataset.tab}]`).classList.add("active");
    });
  });

  // Add to cart
  document.getElementById("dt-add").addEventListener("click", () => {
    if (!p.in_stock) return;
    Cart.add(p, 1);
    toast(`Added "${p.title}" to cart`);
  });

  // Wishlist
  const wishBtn = document.getElementById("dt-wish");
  wishBtn.addEventListener("click", () => {
    const isOn = Wishlist.toggle(p.id);
    wishBtn.textContent = isOn ? "♥ Saved" : "♡ Save";
    toast(isOn ? "Saved to wishlist" : "Removed from wishlist");
  });

  // Related products
  const related = products.filter((x) => x.id !== p.id && x.category === p.category).slice(0, 4);
  const rel = document.getElementById("related-grid");
  if (rel && related.length) {
    rel.innerHTML = related.map(productCardHTML).join("");
  } else if (rel) {
    rel.parentElement.style.display = "none";
  }
});
