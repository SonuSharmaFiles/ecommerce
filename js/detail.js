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
        <button class="tab-button" data-tab="reviews-tab">Reviews</button>
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

  // Aggregate stats — including the user-submitted ones
  const ratings = all.map((r) => r.rating);
  const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : p.rating;
  const dist = [0, 0, 0, 0, 0];
  all.forEach((r) => dist[r.rating - 1]++);

  panel.innerHTML = `
    <div class="reviews-summary">
      <div>
        <div class="avg-rating">${avg.toFixed(1)}</div>
        <div class="avg-stars">${ratingStars(avg, 16)}</div>
        <div class="text-muted" style="font-size:13px">${all.length} review${all.length === 1 ? "" : "s"}</div>
      </div>
      <div class="review-bars">
        ${[5,4,3,2,1].map((r) => {
          const count = dist[r-1];
          const pct = all.length ? (count / all.length) * 100 : 0;
          return `<div class="review-bar">
            <span>${r}★</span>
            <div class="bar"><span style="width:${pct}%"></span></div>
            <span>${count}</span>
          </div>`;
        }).join("")}
      </div>
    </div>

    <div class="reviews-toolbar">
      <strong>${all.length} review${all.length === 1 ? "" : "s"}</strong>
      <button class="btn btn-primary btn-sm" id="open-review-form">Write a review</button>
    </div>

    <div id="review-form-wrap"></div>

    <div id="review-list">
      ${all.map((r) => reviewCardHTML(r)).join("")}
    </div>

    <p class="text-muted" style="font-size:12px;margin-top:16px">
      💡 Your reviews are saved in this browser. To make them visible to all visitors, add a backend (Firebase / Supabase) — ask in chat to wire it up.
    </p>
  `;

  document.getElementById("open-review-form").addEventListener("click", () => openReviewForm(p));
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
}

function reviewCardHTML(r) {
  const isUser = r.source === "user";
  const canEdit = isUser && Reviews.canEdit(r.id);
  const dateLabel = isUser ? relativeTime(r.createdAt) : (r.date || "");

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
