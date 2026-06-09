// Product detail page — gallery, variants, qty, reviews, related
document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("detail-root");
  if (!root) return;

  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    root.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h2>No product specified</h2><p><a class="link" href="products.html">Back to catalog</a></p></div>`;
    return;
  }

  let products;
  try { products = await loadProducts(); }
  catch {
    root.innerHTML = `<p class="text-muted">Could not load products.</p>`;
    return;
  }

  const p = products.find((x) => x.id === id);
  if (!p) {
    root.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h2>Product not found</h2><p><a class="link" href="products.html">Back to catalog</a></p></div>`;
    return;
  }

  document.title = `${p.title} — ShopFlow`;
  Recent.add(p.id);

  // Add JSON-LD Product schema for SEO
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.description || p.short,
    image: (p.images && p.images[0]) || p.image,
    brand: { "@type": "Brand", name: p.brand },
    sku: p.id,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: p.rating,
      reviewCount: p.ratings_count,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: p.price,
      availability: p.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);

  const disc = discountPercent(p);
  const inWishlist = Wishlist.has(p.id);
  const images = p.images && p.images.length ? p.images : [p.image];

  // Random low-stock indicator for in-stock items
  const lowStock = p.in_stock && Math.random() < 0.35 ? Math.floor(Math.random() * 6) + 3 : null;

  // Sample variants if appropriate
  const variantSets = pickVariantsFor(p);

  document.getElementById("crumbs").innerHTML = `
    <a href="index.html">Home</a><span class="sep">/</span>
    <a href="products.html">Shop</a><span class="sep">/</span>
    <a href="products.html?category=${encodeURIComponent(p.category)}">${escapeHtml(p.category)}</a>
    <span class="sep">/</span><span>${escapeHtml(p.title)}</span>
  `;

  root.innerHTML = `
    <div class="gallery">
      <div class="gallery-main" id="main-img-wrap">
        <img id="main-img" src="${images[0]}" alt="${escapeHtml(p.title)}"/>
      </div>
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
        ${ratingStars(p.rating, 16)}
        <span>${p.rating.toFixed(1)} · <a href="#reviews" class="link">${p.ratings_count} reviews</a></span>
      </div>
      <div class="detail-price">
        <span id="detail-price-now">${formatPrice(p.price)}</span>
        ${p.compare_at ? `<span class="price-old">${formatPrice(p.compare_at)}</span>` : ""}
        ${disc > 0 ? `<span class="badge sale" style="margin-left:8px;font-size:13px">-${disc}%</span>` : ""}
      </div>
      <p class="detail-short">${escapeHtml(p.short || "")}</p>

      <div>
        <span class="stock-pill ${p.in_stock ? (lowStock ? "low" : "in") : "out"}">
          ${p.in_stock
            ? (lowStock ? `● Only ${lowStock} left` : "● In stock")
            : "● Out of stock"}
        </span>
        ${p.in_stock ? `<span class="text-muted" style="margin-left:8px;font-size:13px">Ships within 1–3 business days</span>` : ""}
      </div>

      ${variantSets.map((v) => `
        <div class="variant-block" data-variant-name="${v.name}">
          <label>${escapeHtml(v.label)}: <strong data-variant-selected>${escapeHtml(v.options[0])}</strong></label>
          <div class="variant-options">
            ${v.options.map((o, i) => `<button class="${i === 0 ? "active" : ""}" data-variant-value="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("")}
          </div>
        </div>
      `).join("")}

      <div class="variant-block">
        <label>Quantity</label>
        <div class="qty-stepper">
          <button data-qty="-1" aria-label="Decrease">−</button>
          <input id="qty-input" type="number" value="1" min="1" max="20"/>
          <button data-qty="1" aria-label="Increase">+</button>
        </div>
      </div>

      <div class="detail-actions">
        <button class="btn btn-primary btn-lg" id="dt-add" ${p.in_stock ? "" : "disabled"}>
          ${p.in_stock ? "Add to cart" : "Out of stock"}
        </button>
        <button class="btn btn-outline btn-lg" id="dt-wish" data-wishlist="${p.id}" style="flex:0 0 140px">
          ${inWishlist ? "♥ Saved" : "♡ Save"}
        </button>
      </div>

      <div class="detail-perks">
        <div class="detail-perk">🚚 Free over $75</div>
        <div class="detail-perk">🔒 Secure checkout</div>
        <div class="detail-perk">↩ 30-day returns</div>
      </div>
    </div>

    <div class="detail-tabs" style="grid-column:1/-1" id="reviews">
      <div class="tab-buttons">
        <button class="tab-button active" data-tab="desc">Description</button>
        <button class="tab-button" data-tab="specs">Specifications</button>
        <button class="tab-button" data-tab="reviews">Reviews (${p.ratings_count})</button>
        <button class="tab-button" data-tab="shipping">Shipping</button>
      </div>
      <div class="tab-panel active" data-panel="desc">
        <p>${escapeHtml(p.description || p.short || "")}</p>
      </div>
      <div class="tab-panel" data-panel="specs">
        <table class="specs-table">
          ${(p.specs || []).map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.value)}</td></tr>`).join("")}
        </table>
      </div>
      <div class="tab-panel" data-panel="reviews">${renderReviews(p)}</div>
      <div class="tab-panel" data-panel="shipping">
        <p>Free standard shipping on orders over $75. Express options at checkout.</p>
        <ul>
          <li>Standard: 3–5 business days (free over $75, otherwise $7.50)</li>
          <li>Express: 1–2 business days ($19)</li>
          <li>International: 7–14 business days (varies by country)</li>
        </ul>
        <p>30-day returns, free for unused items in original packaging. <a href="returns.html" class="link">Read our returns policy →</a></p>
      </div>
    </div>
  `;

  // Sticky mobile CTA
  const sticky = document.createElement("div");
  sticky.className = "sticky-cta active";
  sticky.innerHTML = `
    <div>
      <div style="font-size:12px;color:var(--ink-soft)">${escapeHtml(p.title)}</div>
      <div style="font-weight:700">${formatPrice(p.price)}</div>
    </div>
    <button class="btn btn-primary" id="sticky-add" ${p.in_stock ? "" : "disabled"}>
      ${p.in_stock ? "Add to cart" : "Out"}
    </button>
  `;
  document.body.appendChild(sticky);
  document.body.classList.add("sticky-cta-on");

  // Gallery click
  root.querySelectorAll("[data-img]").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll("[data-img]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("main-img").src = images[Number(btn.dataset.img)];
    });
  });

  // Click-to-zoom on main image
  const mainWrap = document.getElementById("main-img-wrap");
  mainWrap.addEventListener("click", () => mainWrap.classList.toggle("zoomed"));

  // Tabs
  root.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      root.querySelectorAll(".tab-panel").forEach((pn) => pn.classList.remove("active"));
      root.querySelector(`[data-panel=${btn.dataset.tab}]`).classList.add("active");
    });
  });

  // Variant selection
  root.querySelectorAll("[data-variant-name]").forEach((block) => {
    block.querySelectorAll("[data-variant-value]").forEach((btn) => {
      btn.addEventListener("click", () => {
        block.querySelectorAll("[data-variant-value]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        block.querySelector("[data-variant-selected]").textContent = btn.dataset.variantValue;
      });
    });
  });

  // Quantity stepper
  const qtyInput = root.querySelector("#qty-input");
  root.querySelectorAll("[data-qty]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = Math.max(1, Math.min(20, Number(qtyInput.value) + Number(btn.dataset.qty)));
      qtyInput.value = next;
    });
  });

  // Add to cart
  function addNow() {
    if (!p.in_stock) return;
    const qty = Math.max(1, Number(qtyInput.value) || 1);
    Cart.add(p, qty);
    openDrawer("cart-drawer");
  }
  document.getElementById("dt-add").addEventListener("click", addNow);
  document.getElementById("sticky-add").addEventListener("click", addNow);

  // Wishlist
  const wishBtn = document.getElementById("dt-wish");
  wishBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const isOn = Wishlist.toggle(p.id);
    wishBtn.textContent = isOn ? "♥ Saved" : "♡ Save";
    toast(isOn ? "Saved to wishlist" : "Removed from wishlist");
  });

  // Related
  const related = products.filter((x) => x.id !== p.id && x.category === p.category).slice(0, 4);
  const rel = document.getElementById("related-grid");
  if (rel) {
    if (related.length) rel.innerHTML = related.map(productCardHTML).join("");
    else rel.parentElement.style.display = "none";
  }

  // Recently viewed (excluding this one)
  const recentIds = Recent.get().filter((rid) => rid !== p.id);
  const recents = recentIds.map((rid) => products.find((x) => x.id === rid)).filter(Boolean).slice(0, 4);
  const recEl = document.getElementById("detail-recent-grid");
  const recSec = document.getElementById("detail-recent-section");
  if (recEl) {
    if (recents.length) recEl.innerHTML = recents.map(productCardHTML).join("");
    else if (recSec) recSec.style.display = "none";
  }
});

function pickVariantsFor(p) {
  const t = p.title.toLowerCase();
  const cat = (p.category || "").toLowerCase();
  const out = [];
  if (t.includes("watch") || t.includes("tracker")) {
    out.push({ name: "color", label: "Color", options: ["Black", "Silver", "Rose Gold"] });
    out.push({ name: "band", label: "Band", options: ["Sport", "Leather", "Metal"] });
  } else if (t.includes("headphone") || t.includes("speaker") || t.includes("buds") || t.includes("earbud")) {
    out.push({ name: "color", label: "Color", options: ["Black", "White", "Navy"] });
  } else if (cat.includes("smart home")) {
    if (t.includes("strip")) out.push({ name: "length", label: "Length", options: ["16ft", "32ft", "65ft"] });
    if (t.includes("bulb") || t.includes("plug")) out.push({ name: "pack", label: "Pack", options: ["1 pack", "2 pack", "4 pack"] });
  }
  return out;
}

function renderReviews(p) {
  const reviews = sampleReviewsFor(p);
  const dist = [0, 0, 0, 0, 0];
  reviews.forEach((r) => dist[r.rating - 1]++);

  return `
    <div class="reviews-summary">
      <div>
        <div class="avg-rating">${p.rating.toFixed(1)}</div>
        <div class="avg-stars">${ratingStars(p.rating, 16)}</div>
        <div class="text-muted" style="font-size:13px">${p.ratings_count} reviews</div>
      </div>
      <div class="review-bars">
        ${[5,4,3,2,1].map((r) => {
          const count = dist[r-1];
          const pct = reviews.length ? (count / reviews.length) * 100 : 0;
          return `<div class="review-bar">
            <span>${r}★</span>
            <div class="bar"><span style="width:${pct}%"></span></div>
            <span>${count}</span>
          </div>`;
        }).join("")}
      </div>
    </div>
    <div>
      ${reviews.map((r) => `
        <div class="review-card">
          <div class="review-head">
            <div class="review-avatar">${getInitials(r.author)}</div>
            <div class="review-meta">
              <strong>${escapeHtml(r.author)}</strong>
              <span>Verified buyer · ${escapeHtml(r.date)}</span>
            </div>
            <div class="review-stars">${ratingStars(r.rating)}</div>
          </div>
          <div class="review-title">${escapeHtml(r.title)}</div>
          <p class="review-body">${escapeHtml(r.body)}</p>
        </div>
      `).join("")}
    </div>
    <div class="write-review">
      <h4 style="margin:0 0 8px">Write a review</h4>
      <p class="text-muted" style="margin:0 0 12px;font-size:13px">Reviews appear here after purchase.</p>
      <a href="contact.html" class="btn btn-outline btn-sm">Contact us</a>
    </div>
  `;
}

function sampleReviewsFor(p) {
  // Deterministic sample reviews seeded by product id
  const pool = [
    { author: "Maya R.", title: "Exceeded expectations", body: "Build quality is great and it arrived faster than expected.", rating: 5, date: "May 12" },
    { author: "Aarav S.", title: "Worth every dollar", body: "I've been using it daily for a month and it's still going strong.", rating: 5, date: "Apr 28" },
    { author: "Lena K.", title: "Looks better in person", body: "Photos don't do it justice. Subtle design with a premium feel.", rating: 4, date: "Apr 19" },
    { author: "Diego M.", title: "Good but not perfect", body: "Solid product but the manual could be clearer.", rating: 4, date: "Mar 30" },
    { author: "Priya P.", title: "Surprised me", body: "Honestly didn't expect this much from a $79 item.", rating: 5, date: "Mar 18" },
    { author: "Tomás L.", title: "Highly recommended", body: "Bought one for my partner and one for myself.", rating: 5, date: "Mar 02" },
    { author: "Sara J.", title: "Decent value", body: "Does the job. Battery lasts about as advertised.", rating: 4, date: "Feb 22" },
  ];
  // Hash-shift the pool by product id so each product looks different
  const seed = p.id.split("").reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 0);
  const shift = seed % pool.length;
  return [pool[shift], pool[(shift + 1) % pool.length], pool[(shift + 2) % pool.length]];
}
