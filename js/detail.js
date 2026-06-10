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

  // Dynamic SEO meta — Open Graph / Twitter card per product
  const imageUrl = (p.images && p.images[0]) || p.image;
  const ogDesc = (p.short || p.description || "").replace(/<[^>]+>/g, "").slice(0, 160);
  const setMeta = (sel, attrs) => {
    let el = document.querySelector(sel);
    if (!el) {
      el = document.createElement("meta");
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
    } else {
      el.setAttribute("content", attrs.content);
    }
  };
  setMeta('meta[name="description"]', { name: "description", content: ogDesc });
  setMeta('meta[property="og:type"]', { property: "og:type", content: "product" });
  setMeta('meta[property="og:title"]', { property: "og:title", content: `${p.title} — ShopFlow` });
  setMeta('meta[property="og:description"]', { property: "og:description", content: ogDesc });
  setMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl });
  setMeta('meta[property="og:url"]', { property: "og:url", content: location.href });
  setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
  setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: p.title });
  setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: ogDesc });
  setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl });
  // Canonical
  let canon = document.querySelector('link[rel="canonical"]');
  if (!canon) {
    canon = document.createElement("link");
    canon.rel = "canonical";
    document.head.appendChild(canon);
  }
  canon.href = `https://sonusharmafiles.github.io/ecommerce/product.html?id=${p.id}`;

  // Add JSON-LD Product schema for SEO (uses effective stats incl. user reviews)
  const initialStats = effectiveStats(p);
  const ldScript = document.createElement("script");
  ldScript.type = "application/ld+json";
  function renderLd() {
    const stats = effectiveStats(p);
    ldScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.title,
      description: p.description || p.short,
      image: (p.images && p.images[0]) || p.image,
      brand: { "@type": "Brand", name: p.brand },
      sku: p.id,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(stats.rating.toFixed(2)),
        reviewCount: stats.count,
      },
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: p.price,
        availability: p.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
    });
  }
  renderLd();
  document.head.appendChild(ldScript);
  document.addEventListener("reviews:changed", (e) => {
    if (e.detail === p.id) renderLd();
  });

  const disc = discountPercent(p);
  const inWishlist = Wishlist.has(p.id);
  const images = p.images && p.images.length ? p.images : [p.image];
  const lowStock = p.in_stock && Math.random() < 0.35 ? Math.floor(Math.random() * 6) + 3 : null;
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
      <div class="detail-rating" data-rating-row="${p.id}" data-baseline-rating="${p.rating}" data-baseline-count="${p.ratings_count}">
        <span data-rating-stars data-size="16">${ratingStars(initialStats.rating, 16)}</span>
        <span>
          <span data-rating-value>${initialStats.rating.toFixed(1)}</span>
          ·
          <a href="#reviews" class="link"><span data-rating-count>${initialStats.count}</span> reviews</a>
        </span>
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

      ${p.in_stock ? `
      <div class="urgency-stack">
        <div class="urgency-row"><span class="pulse"></span><span><strong>${Math.floor(Math.random() * 18 + 6)}</strong> sold today</span></div>
        <div class="urgency-row"><span class="pulse warning"></span><span><strong>${Math.floor(Math.random() * 30 + 8)}</strong> people viewing this</span></div>
        <div class="urgency-row"><span class="pulse"></span><span>Order in the next <strong>2h 14m</strong> for delivery by <strong>${estimatedDelivery("US")}</strong></span></div>
      </div>
      ` : ""}

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

      <div class="loyalty-banner">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <div class="text">
          <strong>Earn ${Math.round(p.price)} reward points</strong>
          on this order — <a href="account.html">join Rewards free</a> and save on every purchase.
        </div>
      </div>
    </div>

    <div class="detail-tabs" style="grid-column:1/-1" id="reviews">
      <div class="tab-buttons">
        <button class="tab-button active" data-tab="desc">Description</button>
        <button class="tab-button" data-tab="specs">Specifications</button>
        <button class="tab-button" data-tab="reviews-tab">
          Reviews (<span data-review-count-for="${p.id}" data-baseline-count="${p.ratings_count}">${initialStats.count}</span>)
        </button>
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
      <div class="tab-panel" data-panel="reviews-tab" id="reviews-panel"></div>
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

  renderReviewsPanel(p);
  document.addEventListener("reviews:changed", (e) => {
    if (e.detail === p.id || !e.detail) renderReviewsPanel(p);
  });

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

  function addNow() {
    if (!p.in_stock) return;
    const qty = Math.max(1, Number(qtyInput.value) || 1);
    Cart.add(p, qty);
    openDrawer("cart-drawer");
  }
  document.getElementById("dt-add").addEventListener("click", addNow);
  document.getElementById("sticky-add").addEventListener("click", addNow);

  const wishBtn = document.getElementById("dt-wish");
  wishBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const isOn = Wishlist.toggle(p.id);
    wishBtn.textContent = isOn ? "♥ Saved" : "♡ Save";
    toast(isOn ? "Saved to wishlist" : "Removed from wishlist");
  });

  // BreadcrumbList JSON-LD
  const breadcrumbLd = document.createElement("script");
  breadcrumbLd.type = "application/ld+json";
  breadcrumbLd.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: "Shop", item: "/products.html" },
      { "@type": "ListItem", position: 3, name: p.category, item: `/products.html?category=${encodeURIComponent(p.category)}` },
      { "@type": "ListItem", position: 4, name: p.title, item: `/product.html?id=${p.id}` },
    ],
  });
  document.head.appendChild(breadcrumbLd);

  // Frequently bought together: this product + 2 from same category
  const fbtCandidates = products.filter((x) => x.id !== p.id && x.category === p.category && x.in_stock).slice(0, 2);
  renderFBT(p, fbtCandidates);

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

// Frequently Bought Together (bundle with 10% discount)
function renderFBT(main, others) {
  const slot = document.getElementById("fbt-slot");
  if (!slot || others.length === 0) return;
  const bundleItems = [main, ...others];
  const selected = new Set(bundleItems.map((p) => p.id));

  function render() {
    const totalRaw = bundleItems.filter((p) => selected.has(p.id)).reduce((s, p) => s + p.price, 0);
    const bundleDisc = selected.size >= 2 ? totalRaw * 0.10 : 0;
    const finalTotal = totalRaw - bundleDisc;

    slot.innerHTML = `
      <div class="fbt">
        <h3 style="margin:0 0 6px;font-size:17px">Frequently bought together</h3>
        <p class="text-muted" style="margin:0;font-size:13px">Bundle and save 10% on these items.</p>
        <div class="fbt-grid">
          ${bundleItems.map((p, i) => `
            <div class="fbt-item">
              <a href="product.html?id=${p.id}"><img src="${productImage(p)}" alt="${escapeHtml(p.title)}"/></a>
              <div class="title">${escapeHtml(p.title)}</div>
              <div class="price">${formatPrice(p.price)}</div>
              <label><input type="checkbox" data-fbt="${p.id}" ${selected.has(p.id) ? "checked" : ""} ${i === 0 ? "disabled" : ""}/> ${i === 0 ? "This item" : "Include"}</label>
            </div>
            ${i < bundleItems.length - 1 ? `<span class="fbt-plus">+</span>` : ""}
          `).join("")}
        </div>
        <div class="fbt-total">
          <div>
            <span class="text-muted" style="font-size:13px">Total:</span>
            <strong style="font-size:18px;margin-left:6px">${formatPrice(finalTotal)}</strong>
            ${bundleDisc > 0 ? `<span class="savings">Save ${formatPrice(bundleDisc)}</span>` : ""}
          </div>
          <button class="btn btn-primary" id="fbt-add">Add bundle to cart</button>
        </div>
      </div>
    `;
    slot.querySelectorAll("[data-fbt]").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const id = e.target.dataset.fbt;
        if (e.target.checked) selected.add(id);
        else selected.delete(id);
        render();
      });
    });
    slot.querySelector("#fbt-add")?.addEventListener("click", () => {
      let added = 0;
      bundleItems.filter((p) => selected.has(p.id) && p.in_stock).forEach((p) => {
        Cart.add(p, 1);
        added++;
      });
      if (added > 0) {
        toast(`Added ${added} item${added === 1 ? "" : "s"} to cart`);
        openDrawer("cart-drawer");
      }
    });
  }
  render();
}

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

/* ===================================================================
   Reviews panel — combines built-in + user-submitted reviews,
   with write/edit/delete and image upload.
   =================================================================== */

function renderReviewsPanel(p) {
  const panel = document.getElementById("reviews-panel");
  if (!panel) return;

  const userReviews = Reviews.list(p.id);
  const samples = sampleReviewsFor(p);
  const all = [
    ...userReviews.map((r) => ({ ...r, source: "user" })),
    ...samples.map((s) => ({ ...s, source: "sample" })),
  ];

  // Effective stats include the full baseline + user-submitted reviews
  const stats = effectiveStats(p);
  const baselineCount = p.ratings_count || 0;

  // Distribution: scale the baseline rating distribution proportionally,
  // then add the actual user-submitted ratings on top so they show up.
  const dist = baselineRatingDistribution(p);
  userReviews.forEach((r) => { dist[r.rating - 1]++; });
  const distTotal = dist.reduce((s, n) => s + n, 0) || 1;

  panel.innerHTML = `
    <div class="reviews-summary">
      <div>
        <div class="avg-rating">${stats.rating.toFixed(1)}</div>
        <div class="avg-stars">${ratingStars(stats.rating, 16)}</div>
        <div class="text-muted" style="font-size:13px">${stats.count} review${stats.count === 1 ? "" : "s"}</div>
      </div>
      <div class="review-bars">
        ${[5,4,3,2,1].map((r) => {
          const count = dist[r-1];
          const pct = (count / distTotal) * 100;
          return `<div class="review-bar">
            <span>${r}★</span>
            <div class="bar"><span style="width:${pct}%"></span></div>
            <span>${count}</span>
          </div>`;
        }).join("")}
      </div>
    </div>

    <div class="reviews-toolbar">
      <strong>${stats.count} review${stats.count === 1 ? "" : "s"}</strong>
      <button class="btn btn-primary btn-sm" id="open-review-form">Write a review</button>
    </div>

    <div class="review-filters">
      <button class="review-filter-chip active" data-filter="all">All</button>
      <button class="review-filter-chip" data-filter="5">5 ★</button>
      <button class="review-filter-chip" data-filter="4">4 ★</button>
      <button class="review-filter-chip" data-filter="3">3 ★</button>
      <button class="review-filter-chip" data-filter="2">2 ★</button>
      <button class="review-filter-chip" data-filter="1">1 ★</button>
      <button class="review-filter-chip" data-filter="photos">With photos</button>
      <select class="review-sort">
        <option value="newest">Most recent</option>
        <option value="helpful">Most helpful</option>
        <option value="rating_desc">Highest rated</option>
        <option value="rating_asc">Lowest rated</option>
      </select>
    </div>

    <div id="review-form-wrap"></div>

    <div id="review-list">
      ${all.map((r) => reviewCardHTML(r)).join("")}
    </div>

    <p class="text-muted" style="font-size:12px;margin-top:16px">
      Reviews you write are saved on this device.
    </p>
  `;

  // Filter + sort behavior (no full re-render — just toggle list)
  let activeFilter = "all";
  let activeSort = "newest";
  function rerenderList() {
    let list = all.slice();
    if (activeFilter === "photos") list = list.filter((r) => !!r.imageDataUrl);
    else if (activeFilter !== "all") list = list.filter((r) => r.rating === Number(activeFilter));
    switch (activeSort) {
      case "rating_desc": list.sort((a, b) => b.rating - a.rating); break;
      case "rating_asc": list.sort((a, b) => a.rating - b.rating); break;
      case "helpful":
        list.sort((a, b) => {
          const hb = Helpful.countFor(b.id || `s-${b.author}-${b.date}`, b.helpful || 0);
          const ha = Helpful.countFor(a.id || `s-${a.author}-${a.date}`, a.helpful || 0);
          return hb - ha;
        }); break;
      default: // newest first — user reviews already first
        break;
    }
    const list2 = document.getElementById("review-list");
    list2.innerHTML = list.length
      ? list.map(reviewCardHTML).join("")
      : `<p class="text-muted" style="padding:20px 0">No reviews match this filter.</p>`;
    wireReviewActions();
  }
  panel.querySelectorAll(".review-filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      panel.querySelectorAll(".review-filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeFilter = chip.dataset.filter;
      rerenderList();
    });
  });
  panel.querySelector(".review-sort").addEventListener("change", (e) => {
    activeSort = e.target.value;
    rerenderList();
  });

  function wireReviewActions() {
    panel.querySelectorAll("[data-edit-review]").forEach((btn) => {
      btn.addEventListener("click", () => openReviewForm(p, btn.dataset.editReview));
    });
    panel.querySelectorAll("[data-delete-review]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (confirm("Delete this review?")) {
          Reviews.remove(btn.dataset.deleteReview);
          toast("Review deleted");
        }
      });
    });
    panel.querySelectorAll("[data-helpful]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.helpful;
        const isOn = Helpful.toggle(id);
        btn.classList.toggle("active", isOn);
        const countSpan = btn.querySelector("[data-helpful-count]");
        if (countSpan) {
          countSpan.textContent = String(Number(countSpan.dataset.baseline) + (isOn ? 1 : 0));
        }
      });
    });
  }

  document.getElementById("open-review-form").addEventListener("click", () => openReviewForm(p));
  wireReviewActions();
}

function reviewCardHTML(r) {
  const isUser = r.source === "user";
  const canEdit = isUser && Reviews.canEdit(r.id);
  const dateLabel = isUser ? relativeTime(r.createdAt) : (r.date || "");
  const reviewKey = r.id || `s-${r.author}-${r.date}`;
  const baselineHelpful = r.helpful != null ? r.helpful : Math.floor(Math.random() * 15 + 3);
  const userVoted = Helpful.voted(reviewKey);

  return `
    <div class="review-card">
      <div class="review-head">
        <div class="review-avatar">${getInitials(r.author)}</div>
        <div class="review-meta">
          <strong>${escapeHtml(r.author || "Anonymous")}</strong>
          <span>
            ${isUser ? "" : "Verified buyer · "}
            ${escapeHtml(dateLabel)}
            ${r.updatedAt ? ` · edited ${escapeHtml(relativeTime(r.updatedAt))}` : ""}
            ${canEdit ? ` · <span style="color:var(--success);font-weight:600">Your review</span>` : ""}
          </span>
        </div>
        <div class="review-stars">${ratingStars(r.rating)}</div>
      </div>
      ${r.title ? `<div class="review-title">${escapeHtml(r.title)}</div>` : ""}
      <p class="review-body">${escapeHtml(r.body || "")}</p>
      ${r.imageDataUrl ? `<div class="review-image"><img src="${r.imageDataUrl}" alt="Customer photo"/></div>` : ""}
      <div class="review-helpful">
        <span>Was this helpful?</span>
        <button class="${userVoted ? "active" : ""}" data-helpful="${reviewKey}">
          👍 Helpful (<span data-helpful-count data-baseline="${baselineHelpful}">${baselineHelpful + (userVoted ? 1 : 0)}</span>)
        </button>
      </div>
      ${canEdit ? `
        <div class="review-actions">
          <button class="btn btn-outline btn-sm" data-edit-review="${r.id}">Edit</button>
          <button class="btn btn-ghost btn-sm" data-delete-review="${r.id}" style="color:var(--danger)">Delete</button>
        </div>
      ` : ""}
    </div>
  `;
}

function openReviewForm(product, editId) {
  const wrap = document.getElementById("review-form-wrap");
  if (!wrap) return;

  let existing = null;
  if (editId) {
    existing = Reviews.all().find((r) => r.id === editId);
    if (!existing) { toast("Review not found"); return; }
    if (!Reviews.canEdit(editId)) { toast("You can only edit your own reviews"); return; }
  }

  wrap.innerHTML = `
    <form class="review-form" id="review-form" novalidate>
      <h3 style="margin:0 0 6px">${existing ? "Edit your review" : "Write a review"}</h3>
      <p class="text-muted" style="margin:0 0 16px;font-size:13px">
        Share your experience with ${escapeHtml(product.title)}.
      </p>

      <label>Your rating</label>
      <div class="star-picker" id="star-picker" data-value="${existing?.rating ?? 5}">
        ${[1,2,3,4,5].map((n) => `
          <button type="button" data-star="${n}" aria-label="${n} stars">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z"/></svg>
          </button>
        `).join("")}
      </div>

      <div class="form-row">
        <div>
          <label for="rv-author">Your name</label>
          <input class="input" id="rv-author" required maxlength="60" value="${escapeHtml(existing?.author ?? "")}" />
        </div>
        <div>
          <label for="rv-title">Title</label>
          <input class="input" id="rv-title" maxlength="100" placeholder="Sums it up in a few words" value="${escapeHtml(existing?.title ?? "")}" />
        </div>
      </div>

      <div class="form-row full">
        <div>
          <label for="rv-body">Your review</label>
          <textarea class="input" id="rv-body" rows="5" required maxlength="2000" placeholder="What did you like? What could be better?">${escapeHtml(existing?.body ?? "")}</textarea>
        </div>
      </div>

      <div class="form-row full">
        <div>
          <label>Add a photo (optional)</label>
          <div class="review-image-upload">
            <label for="rv-image" class="upload-trigger">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>Choose image</span>
              <input id="rv-image" type="file" accept="image/*" hidden/>
            </label>
            <div class="review-image-preview" id="rv-preview">
              ${existing?.imageDataUrl ? `<img src="${existing.imageDataUrl}" alt="Preview"/><button type="button" data-remove-image>×</button>` : ""}
            </div>
          </div>
          <small class="text-muted">JPG/PNG up to 12MB. Resized to 800px wide.</small>
        </div>
      </div>

      <div class="review-form-actions">
        <button type="submit" class="btn btn-primary">${existing ? "Save changes" : "Submit review"}</button>
        <button type="button" class="btn btn-ghost" data-cancel-review>Cancel</button>
      </div>
    </form>
  `;

  wrap.scrollIntoView({ behavior: "smooth", block: "start" });

  // Track image data url in form state
  let pendingImage = existing?.imageDataUrl || null;

  // Star picker
  const picker = wrap.querySelector("#star-picker");
  function paintStars(n) {
    picker.querySelectorAll("[data-star]").forEach((b) => {
      b.classList.toggle("filled", Number(b.dataset.star) <= n);
    });
    picker.dataset.value = String(n);
  }
  paintStars(existing?.rating ?? 5);
  picker.addEventListener("click", (e) => {
    const b = e.target.closest("[data-star]");
    if (b) paintStars(Number(b.dataset.star));
  });

  // Image upload
  const fileInput = wrap.querySelector("#rv-image");
  const preview = wrap.querySelector("#rv-preview");
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file, 800, 0.85);
      pendingImage = dataUrl;
      preview.innerHTML = `<img src="${dataUrl}" alt="Preview"/><button type="button" data-remove-image>×</button>`;
    } catch (err) {
      toast(err.message || "Could not load that image.");
    }
  });
  preview.addEventListener("click", (e) => {
    if (e.target.closest("[data-remove-image]")) {
      pendingImage = null;
      preview.innerHTML = "";
      fileInput.value = "";
    }
  });

  // Cancel
  wrap.querySelector("[data-cancel-review]").addEventListener("click", () => {
    wrap.innerHTML = "";
  });

  // Submit
  wrap.querySelector("#review-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const author = wrap.querySelector("#rv-author").value.trim();
    const title = wrap.querySelector("#rv-title").value.trim();
    const body = wrap.querySelector("#rv-body").value.trim();
    const rating = Number(picker.dataset.value) || 5;
    if (!author) { toast("Please enter your name"); return; }
    if (!body) { toast("Please write your review"); return; }

    try {
      if (existing) {
        Reviews.update(existing.id, { author, title, body, rating, imageDataUrl: pendingImage });
        toast("Review updated");
      } else {
        Reviews.add(product.id, { author, title, body, rating, imageDataUrl: pendingImage });
        toast("Thanks for your review!");
      }
      wrap.innerHTML = "";
    } catch (err) {
      // localStorage quota exceeded usually means too many big images
      toast("Could not save — your browser storage may be full. Try removing the photo.");
    }
  });
}

// Derive a 5-bucket rating distribution from the product's average + count.
// Real ecommerce stars: skew toward the average and 5★. Returns array of 5
// numbers (counts for 1★, 2★, 3★, 4★, 5★) summing to p.ratings_count.
function baselineRatingDistribution(p) {
  const total = p.ratings_count || 0;
  if (total === 0) return [0, 0, 0, 0, 0];
  const avg = p.rating || 4.5;
  // Weight function: higher weight closer to the average, with a 5★ skew.
  const weights = [1, 2, 3, 4, 5].map((r) => {
    const distance = Math.abs(r - avg);
    const w = Math.exp(-distance * distance / 0.6); // gaussian-ish
    return r === 5 ? w * 1.4 : w;
  });
  const sumW = weights.reduce((s, w) => s + w, 0);
  let remaining = total;
  const result = weights.map((w, i, arr) => {
    if (i === arr.length - 1) return remaining;
    const n = Math.round((w / sumW) * total);
    remaining -= n;
    return n;
  });
  return result;
}

function sampleReviewsFor(p) {
  const pool = [
    { author: "Maya R.", title: "Exceeded expectations", body: "Build quality is great and it arrived faster than expected.", rating: 5, date: "May 12" },
    { author: "Aarav S.", title: "Worth every dollar", body: "I've been using it daily for a month and it's still going strong.", rating: 5, date: "Apr 28" },
    { author: "Lena K.", title: "Looks better in person", body: "Photos don't do it justice. Subtle design with a premium feel.", rating: 4, date: "Apr 19" },
    { author: "Diego M.", title: "Good but not perfect", body: "Solid product but the manual could be clearer.", rating: 4, date: "Mar 30" },
    { author: "Priya P.", title: "Surprised me", body: "Honestly didn't expect this much from a $79 item.", rating: 5, date: "Mar 18" },
    { author: "Tomás L.", title: "Highly recommended", body: "Bought one for my partner and one for myself.", rating: 5, date: "Mar 02" },
    { author: "Sara J.", title: "Decent value", body: "Does the job. Battery lasts about as advertised.", rating: 4, date: "Feb 22" },
  ];
  const seed = p.id.split("").reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 0);
  const shift = seed % pool.length;
  return [pool[shift], pool[(shift + 1) % pool.length], pool[(shift + 2) % pool.length]];
}
