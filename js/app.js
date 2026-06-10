/* ===================================================================
   Shared utilities, layout injection, cart, wishlist, currency, etc.
   =================================================================== */

const CART_KEY = "shopflow-cart";
const WISHLIST_KEY = "shopflow-wishlist";
const RECENT_KEY = "shopflow-recent";
const PROMO_KEY = "shopflow-promo";
const COOKIE_KEY = "shopflow-cookies-ok";
const CURRENCY_KEY = "shopflow-currency";
const PROMO_BAR_KEY = "shopflow-promo-bar-dismissed";
const REVIEWS_KEY = "shopflow-reviews";
const BROWSER_KEY = "shopflow-browser-id";
const SAVED_KEY = "shopflow-saved";
const COMPARE_KEY = "shopflow-compare";
const HELPFUL_KEY = "shopflow-helpful";
const LOYALTY_KEY = "shopflow-loyalty-points";
const THEME_KEY = "shopflow-theme";

// ---- Theme (dark mode) ----
const Theme = {
  get() {
    return localStorage.getItem(THEME_KEY)
      || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  },
  apply(value) {
    if (value === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  },
  set(value) {
    localStorage.setItem(THEME_KEY, value);
    Theme.apply(value);
  },
  toggle() {
    const next = Theme.get() === "dark" ? "light" : "dark";
    Theme.set(next);
    return next;
  },
};
// Apply theme as early as possible to avoid flash
Theme.apply(Theme.get());

// ---- Saved for later ----
const Saved = {
  get() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; }
    catch { return []; }
  },
  set(items) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent("saved:changed"));
  },
  has(id) { return Saved.get().some((i) => i.id === id); },
  add(item) {
    const items = Saved.get().filter((i) => i.id !== item.id);
    items.push(item);
    Saved.set(items);
  },
  remove(id) { Saved.set(Saved.get().filter((i) => i.id !== id)); },
  count() { return Saved.get().length; },
};

// ---- Compare ----
const Compare = {
  MAX: 4,
  get() {
    try { return JSON.parse(localStorage.getItem(COMPARE_KEY)) || []; }
    catch { return []; }
  },
  set(ids) {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));
    document.dispatchEvent(new CustomEvent("compare:changed"));
  },
  has(id) { return Compare.get().includes(id); },
  toggle(id) {
    const list = Compare.get();
    if (list.includes(id)) { Compare.set(list.filter((x) => x !== id)); return false; }
    if (list.length >= Compare.MAX) {
      toast(`You can only compare up to ${Compare.MAX} products`);
      return false;
    }
    Compare.set([...list, id]);
    return true;
  },
  remove(id) { Compare.set(Compare.get().filter((x) => x !== id)); },
  clear() { Compare.set([]); },
};

// ---- Review helpful votes (per browser) ----
const Helpful = {
  get() {
    try { return JSON.parse(localStorage.getItem(HELPFUL_KEY)) || {}; }
    catch { return {}; }
  },
  toggle(reviewId) {
    const map = Helpful.get();
    map[reviewId] = !map[reviewId];
    if (!map[reviewId]) delete map[reviewId];
    localStorage.setItem(HELPFUL_KEY, JSON.stringify(map));
    return !!map[reviewId];
  },
  voted(reviewId) { return !!Helpful.get()[reviewId]; },
  countFor(reviewId, baseline = 0) {
    return baseline + (Helpful.voted(reviewId) ? 1 : 0);
  },
};

// ---- Loyalty points (display-only teaser) ----
const Loyalty = {
  get() { return Number(localStorage.getItem(LOYALTY_KEY)) || 0; },
  add(n) { localStorage.setItem(LOYALTY_KEY, String(Math.max(0, Loyalty.get() + n))); },
};

// ---- Browser identity (stable per browser, used to gate edit/delete) ----
function getBrowserId() {
  let id = localStorage.getItem(BROWSER_KEY);
  if (!id) {
    id = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : "b-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    localStorage.setItem(BROWSER_KEY, id);
  }
  return id;
}

// ---- Reviews (localStorage, per-browser identity) ----
const Reviews = {
  all() {
    try { return JSON.parse(localStorage.getItem(REVIEWS_KEY)) || []; }
    catch { return []; }
  },
  list(productId) {
    return this.all()
      .filter((r) => r.productId === productId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  add(productId, data) {
    const reviews = this.all();
    const review = {
      id: (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
      productId,
      browserId: getBrowserId(),
      author: data.author,
      rating: Math.max(1, Math.min(5, Number(data.rating) || 5)),
      title: data.title || "",
      body: data.body || "",
      imageDataUrl: data.imageDataUrl || null,
      createdAt: new Date().toISOString(),
    };
    reviews.push(review);
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
    document.dispatchEvent(new CustomEvent("reviews:changed", { detail: productId }));
    return review;
  },
  update(id, data) {
    const reviews = this.all();
    const idx = reviews.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    if (reviews[idx].browserId !== getBrowserId()) return false;
    reviews[idx] = {
      ...reviews[idx],
      author: data.author ?? reviews[idx].author,
      rating: data.rating != null ? Math.max(1, Math.min(5, Number(data.rating))) : reviews[idx].rating,
      title: data.title ?? reviews[idx].title,
      body: data.body ?? reviews[idx].body,
      imageDataUrl: data.imageDataUrl !== undefined ? data.imageDataUrl : reviews[idx].imageDataUrl,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
    document.dispatchEvent(new CustomEvent("reviews:changed", { detail: reviews[idx].productId }));
    return reviews[idx];
  },
  remove(id) {
    const reviews = this.all();
    const review = reviews.find((r) => r.id === id);
    if (!review) return false;
    if (review.browserId !== getBrowserId()) return false;
    const remaining = reviews.filter((r) => r.id !== id);
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(remaining));
    document.dispatchEvent(new CustomEvent("reviews:changed", { detail: review.productId }));
    return true;
  },
  canEdit(id) {
    const r = this.all().find((x) => x.id === id);
    return !!(r && r.browserId === getBrowserId());
  },
};

// ---- Image helper: resize and convert to base64 ----
async function fileToResizedDataUrl(file, maxWidth = 800, quality = 0.85) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Please upload an image file.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Image too large. Please use one under 12MB.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Could not load that image."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function relativeTime(iso) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const SITE = {
  name: "ShopFlow",
  url: "/",
  description: "Premium products, fast delivery worldwide.",
  email: "support@shopflow.io",
  phone: "+1 (555) 010-0123",
};

// ---- Currencies (display only — fixed rates) ----
const CURRENCIES = {
  USD: { symbol: "$",  locale: "en-US", rate: 1 },
  EUR: { symbol: "€",  locale: "en-IE", rate: 0.92 },
  GBP: { symbol: "£",  locale: "en-GB", rate: 0.79 },
  AUD: { symbol: "A$", locale: "en-AU", rate: 1.52 },
  CAD: { symbol: "C$", locale: "en-CA", rate: 1.37 },
  INR: { symbol: "₹",  locale: "en-IN", rate: 83.20 },
  NPR: { symbol: "रू", locale: "ne-NP", rate: 133.50 },
};

function currentCurrency() {
  const c = localStorage.getItem(CURRENCY_KEY);
  return CURRENCIES[c] ? c : "USD";
}

function setCurrency(c) {
  if (!CURRENCIES[c]) return;
  localStorage.setItem(CURRENCY_KEY, c);
  document.dispatchEvent(new CustomEvent("currency:changed", { detail: c }));
}

function formatPrice(usd) {
  const code = currentCurrency();
  const meta = CURRENCIES[code];
  const value = usd * meta.rate;
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${meta.symbol}${value.toFixed(2)}`;
  }
}

// ---- Coupons (demo) ----
const COUPONS = {
  WELCOME10: { kind: "percent", value: 10, label: "10% off your order" },
  FREESHIP:  { kind: "free_ship", value: 0, label: "Free shipping" },
  SAVE20:    { kind: "percent", value: 20, label: "20% off (min $100)" , min: 100 },
};

// ---- Cart ----
const Cart = {
  get() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  },
  set(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    Cart.updateBadge();
    document.dispatchEvent(new CustomEvent("cart:changed"));
  },
  add(product, qty = 1) {
    const items = Cart.get();
    const existing = items.find((i) => i.id === product.id);
    if (existing) existing.qty += qty;
    else items.push({
      id: product.id, title: product.title,
      price: product.price, image: product.image, qty,
    });
    Cart.set(items);
  },
  updateQty(id, qty) {
    const items = Cart.get().map((i) => i.id === id ? { ...i, qty: Math.max(1, qty) } : i);
    Cart.set(items);
  },
  remove(id) { Cart.set(Cart.get().filter((i) => i.id !== id)); },
  clear() { Cart.set([]); Promo.clear(); },
  count() { return Cart.get().reduce((s, i) => s + i.qty, 0); },
  subtotal() { return Cart.get().reduce((s, i) => s + i.price * i.qty, 0); },
  updateBadge() {
    document.querySelectorAll(".cart-count").forEach((el) => {
      const n = Cart.count();
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  },
};

// ---- Wishlist ----
const Wishlist = {
  get() {
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; }
    catch { return []; }
  },
  set(ids) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
    Wishlist.updateBadge();
    document.dispatchEvent(new CustomEvent("wishlist:changed"));
  },
  has(id) { return Wishlist.get().includes(id); },
  toggle(id) {
    const list = Wishlist.get();
    if (list.includes(id)) { Wishlist.set(list.filter((x) => x !== id)); return false; }
    Wishlist.set([...list, id]); return true;
  },
  remove(id) { Wishlist.set(Wishlist.get().filter((x) => x !== id)); },
  updateBadge() {
    document.querySelectorAll(".wishlist-count").forEach((el) => {
      const n = Wishlist.get().length;
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  },
};

// ---- Recently viewed ----
const Recent = {
  MAX: 10,
  get() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
    catch { return []; }
  },
  add(id) {
    let list = Recent.get().filter((x) => x !== id);
    list.unshift(id);
    if (list.length > Recent.MAX) list = list.slice(0, Recent.MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  },
};

// ---- Promo / coupon ----
const Promo = {
  get() {
    try { return JSON.parse(localStorage.getItem(PROMO_KEY)); }
    catch { return null; }
  },
  apply(code) {
    code = (code || "").toUpperCase().trim();
    const c = COUPONS[code];
    if (!c) return { ok: false, error: "Invalid coupon code." };
    const subtotal = Cart.subtotal();
    if (c.min && subtotal < c.min) {
      return { ok: false, error: `Add ${formatPrice(c.min - subtotal)} more to use this code.` };
    }
    localStorage.setItem(PROMO_KEY, JSON.stringify({ code, ...c }));
    document.dispatchEvent(new CustomEvent("cart:changed"));
    return { ok: true, coupon: c };
  },
  clear() {
    localStorage.removeItem(PROMO_KEY);
    document.dispatchEvent(new CustomEvent("cart:changed"));
  },
  discount(subtotal) {
    const p = Promo.get();
    if (!p) return 0;
    if (p.min && subtotal < p.min) return 0;
    if (p.kind === "percent") return +(subtotal * p.value / 100).toFixed(2);
    if (p.kind === "fixed") return Math.min(p.value, subtotal);
    return 0;
  },
};

// ---- Toast ----
function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 1800);
}

// ---- Products loader (cached for the page lifetime) ----
async function loadProducts() {
  if (!window._productsCache) {
    window._productsCache = fetch("data/products.json").then((r) => {
      if (!r.ok) throw new Error("Could not load products");
      return r.json();
    });
  }
  return window._productsCache;
}

// ---- Helpers ----
function productImage(p) {
  return p.image || (p.images && p.images[0]) || "";
}

// Inline SVG fallback for broken/missing images — colored block with initials.
// Used by the global image-error handler so no card ever shows a browser
// "broken image" icon.
function placeholderDataUri(label) {
  const text = (label || "Product").trim() || "Product";
  const words = text.split(/\s+/).filter(Boolean);
  const initials = (
    (words[0]?.[0] ?? "") + (words[1]?.[0] ?? words[0]?.[1] ?? "")
  ).toUpperCase().slice(0, 2) || "S";

  // Deterministic pleasant hue from the label so each product keeps its color.
  let hash = 7;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  const hue = hash % 360;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue},35%,94%)"/>
        <stop offset="100%" stop-color="hsl(${hue},28%,82%)"/>
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="url(#g)"/>
    <g opacity="0.18" fill="none" stroke="hsl(${hue},30%,30%)" stroke-width="3">
      <circle cx="120" cy="120" r="60"/>
      <circle cx="480" cy="500" r="80"/>
      <path d="M380 80 l40 40 l-40 40 l-40 -40 z"/>
    </g>
    <text x="300" y="335" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="200" font-weight="800" fill="hsl(${hue},35%,28%)" opacity="0.55" letter-spacing="-6">${initials}</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

// Global image error handler: catches any <img> that fails to load and swaps
// it for a nice fallback. Listens in capture phase because the `error` event
// from an <img> doesn't bubble.
document.addEventListener("error", (e) => {
  const img = e.target;
  if (!img || img.tagName !== "IMG") return;
  if (img.dataset.fb === "1") return;            // already swapped
  img.dataset.fb = "1";
  img.src = placeholderDataUri(img.alt || img.dataset.label || "Product");
}, true);
function discountPercent(p) {
  if (!p.compare_at || p.compare_at <= p.price) return 0;
  return Math.round(((p.compare_at - p.price) / p.compare_at) * 100);
}
// Renders 5 stars where the gold fill exactly matches the rating fraction.
// A rating of 4.7 → first 4 stars fully gold, 5th star 70% gold left-to-right.
function ratingStars(rating, size = 12) {
  const max = 5;
  const r = Math.max(0, Math.min(max, Number(rating) || 0));
  const pct = (r / max) * 100;
  const star = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z"/></svg>`;
  const row = star.repeat(5);
  return `<span class="stars" role="img" aria-label="${r.toFixed(1)} out of ${max} stars"><span class="stars-bg">${row}</span><span class="stars-fg" style="width:${pct.toFixed(2)}%">${row}</span></span>`;
}
function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

// ---- Effective stats: combine baseline (products.json) with user reviews ----
function effectiveStats(p) {
  const userReviews = Reviews.list(p.id);
  const userSum = userReviews.reduce((s, r) => s + r.rating, 0);
  const totalCount = (p.ratings_count || 0) + userReviews.length;
  const totalSum = (p.rating || 0) * (p.ratings_count || 0) + userSum;
  const rating = totalCount > 0 ? totalSum / totalCount : (p.rating || 0);
  return { rating, count: totalCount, userCount: userReviews.length };
}

// ---- Product card HTML ----
function productCardHTML(p) {
  const disc = discountPercent(p);
  const badges = [];
  if (disc > 0) badges.push(`<span class="badge sale">-${disc}%</span>`);
  if (p.badges?.includes("new")) badges.push(`<span class="badge new">New</span>`);
  if (p.badges?.includes("best_seller")) badges.push(`<span class="badge best">Best seller</span>`);
  if (!p.in_stock) badges.push(`<span class="badge">Out of stock</span>`);

  const inWishlist = Wishlist.has(p.id);
  const stats = effectiveStats(p);

  const inCompare = Compare.has(p.id);

  return `
    <article class="product-card" data-product-card="${p.id}">
      <a href="product.html?id=${p.id}" class="product-media">
        <img src="${productImage(p)}" alt="${escapeHtml(p.title)}" loading="lazy" />
        <div class="product-badges">${badges.join("")}</div>
        <button class="quick-view-btn" data-quick-view="${p.id}" aria-label="Quick view">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Quick view
        </button>
      </a>
      <button class="wishlist-btn ${inWishlist ? "active" : ""}" data-wishlist="${p.id}" aria-label="Toggle wishlist" title="Wishlist">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
      <label class="compare-check ${inCompare ? "active" : ""}" data-compare-label="${p.id}">
        <input type="checkbox" data-compare="${p.id}" ${inCompare ? "checked" : ""}/>
        Compare
      </label>
      <div class="product-body">
        <div class="product-meta">${escapeHtml(p.brand)} · ${escapeHtml(p.category)}</div>
        <a href="product.html?id=${p.id}" class="product-title">${escapeHtml(p.title)}</a>
        <div class="product-rating" data-rating-row="${p.id}" data-baseline-rating="${p.rating}" data-baseline-count="${p.ratings_count}">
          <span data-rating-stars>${ratingStars(stats.rating)}</span>
          <span><span data-rating-value>${stats.rating.toFixed(1)}</span> (<span data-rating-count>${stats.count}</span>)</span>
        </div>
        <div class="product-bottom">
          <div>
            <span class="price-now">${formatPrice(p.price)}</span>
            ${p.compare_at ? `<span class="price-old">${formatPrice(p.compare_at)}</span>` : ""}
          </div>
          <button class="add-btn" data-add="${p.id}" ${p.in_stock ? "" : "disabled"}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            Add
          </button>
        </div>
      </div>
    </article>
  `;
}

// ---- When reviews change, update every visible count/rating for that product ----
function refreshProductStats(productId) {
  document.querySelectorAll(`[data-rating-row="${productId}"]`).forEach((row) => {
    const baseRating = Number(row.dataset.baselineRating) || 0;
    const baseCount = Number(row.dataset.baselineCount) || 0;
    const userReviews = Reviews.list(productId);
    const userSum = userReviews.reduce((s, r) => s + r.rating, 0);
    const totalCount = baseCount + userReviews.length;
    const totalSum = baseRating * baseCount + userSum;
    const rating = totalCount > 0 ? totalSum / totalCount : baseRating;

    const starsEl = row.querySelector("[data-rating-stars]");
    const valueEl = row.querySelector("[data-rating-value]");
    const countEl = row.querySelector("[data-rating-count]");
    if (starsEl) starsEl.innerHTML = ratingStars(rating, starsEl.dataset.size ? Number(starsEl.dataset.size) : 12);
    if (valueEl) valueEl.textContent = rating.toFixed(1);
    if (countEl) countEl.textContent = String(totalCount);
  });

  // Plain count-only badges (e.g. tab labels)
  document.querySelectorAll(`[data-review-count-for="${productId}"]`).forEach((el) => {
    const baseCount = Number(el.dataset.baselineCount) || 0;
    const total = baseCount + Reviews.list(productId).length;
    const label = el.dataset.label || "review";
    el.textContent = `${total} ${label}${total === 1 ? "" : "s"}`;
  });
}

document.addEventListener("reviews:changed", (e) => {
  if (e.detail) refreshProductStats(e.detail);
});

/* ===================================================================
   Layout: shared header + footer + drawers, injected into every page.
   =================================================================== */

const NAV_LINKS = [
  { href: "index.html", label: "Home" },
  { href: "products.html", label: "Shop" },
  { href: "products.html?sort=newest", label: "New" },
  { href: "about.html", label: "About" },
  { href: "contact.html", label: "Contact" },
];

function renderLayout() {
  const dismissed = localStorage.getItem(PROMO_BAR_KEY) === "1";
  const promoBar = dismissed ? "" : `
    <div class="promo-bar" id="promo-bar">
      <span class="promo-msg">Free shipping over $75 — use code <strong>WELCOME10</strong> for 10% off your first order</span>
      <button class="promo-close" aria-label="Dismiss" data-action="dismiss-promo">×</button>
    </div>`;

  const header = `
    <a href="#main" class="skip-link">Skip to content</a>
    ${promoBar}
    <header class="site-header">
      <div class="container nav">
        <button class="icon-btn menu-toggle" aria-label="Menu" data-action="open-menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <a href="index.html" class="brand"><span class="brand-mark"></span> ShopFlow</a>
        <nav class="nav-links" aria-label="Primary">
          <a href="index.html">Home</a>
          <span class="megamenu-wrap" id="megamenu-wrap">
            <button class="megamenu-trigger" aria-haspopup="true" aria-expanded="false" id="megamenu-trigger">
              Shop
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="megamenu" id="megamenu" role="menu">
              <div>
                <h4>Categories</h4>
                <div class="megamenu-list" id="megamenu-categories"></div>
              </div>
              <div>
                <h4>Featured</h4>
                <div class="megamenu-featured" id="megamenu-featured"></div>
              </div>
            </div>
          </span>
          <a href="products.html?sort=newest">New</a>
          <a href="compare.html">Compare</a>
          <a href="about.html">About</a>
          <a href="contact.html">Contact</a>
        </nav>
        <div class="search-wrap" id="search-wrap">
          <form class="header-search" role="search" action="products.html" method="get">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" name="q" id="instant-search" placeholder="Search products, brands, deals…" autocomplete="off"/>
          </form>
          <div class="search-dropdown" id="search-dropdown"></div>
        </div>
        <div class="nav-actions">
          <button class="theme-toggle" aria-label="Toggle dark mode" data-action="toggle-theme">
            <svg class="moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            <svg class="sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          </button>
          <select class="currency-select" aria-label="Currency">
            ${Object.keys(CURRENCIES).map((c) => `<option value="${c}">${c}</option>`).join("")}
          </select>
          <a class="icon-btn" href="wishlist.html" aria-label="Wishlist">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span class="icon-badge wishlist-count" hidden>0</span>
          </a>
          <button class="icon-btn" aria-label="Cart" data-action="open-cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <span class="icon-badge cart-count" hidden>0</span>
          </button>
        </div>
      </div>
    </header>
  `;

  const footer = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-cols">
          <div>
            <div class="brand"><span class="brand-mark"></span> ShopFlow</div>
            <p class="text-muted" style="max-width:340px;margin-top:12px">
              Premium products, fast worldwide delivery, and a buying experience designed for the modern shopper.
            </p>
            <div class="payment-logos" style="margin-top:12px">
              <span class="pay-pill">VISA</span>
              <span class="pay-pill">MASTERCARD</span>
              <span class="pay-pill">AMEX</span>
              <span class="pay-pill">PAYPAL</span>
              <span class="pay-pill">APPLE PAY</span>
              <span class="pay-pill">G PAY</span>
            </div>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li><a href="products.html">All products</a></li>
              <li><a href="products.html?category=Audio">Audio</a></li>
              <li><a href="products.html?category=Smart%20Home">Smart Home</a></li>
              <li><a href="products.html?category=Wearables">Wearables</a></li>
              <li><a href="products.html?sort=price_asc">Deals</a></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="about.html">About</a></li>
              <li><a href="contact.html">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              <li><a href="faq.html">FAQ</a></li>
              <li><a href="track-order.html">Track order</a></li>
              <li><a href="shipping.html">Shipping</a></li>
              <li><a href="returns.html">Returns</a></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><a href="privacy.html">Privacy</a></li>
              <li><a href="terms.html">Terms</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© <span data-year></span> ${SITE.name}. All rights reserved.</span>
          <span>Made with care · Free shipping over $75</span>
        </div>
      </div>
    </footer>
  `;

  const drawers = `
    <div class="drawer-backdrop" id="drawer-backdrop"></div>
    <aside class="drawer left" id="menu-drawer" aria-hidden="true">
      <div class="drawer-header">
        <h3>Menu</h3>
        <button class="drawer-close icon-btn" data-action="close-drawer" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="drawer-body">
        <form class="mobile-drawer-search" role="search" action="products.html" method="get">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" name="q" placeholder="Search products…" autocomplete="off"/>
        </form>
        <nav class="mobile-menu-links" aria-label="Mobile">
          ${NAV_LINKS.map((l) => `<a href="${l.href}">${l.label}</a>`).join("")}
          <a href="compare.html">Compare</a>
          <a href="wishlist.html">Wishlist</a>
          <a href="account.html">My account</a>
          <a href="cart.html">Cart</a>
        </nav>
        <div class="mobile-menu-section">
          <h4>Support</h4>
          <nav class="mobile-menu-links">
            <a href="faq.html">FAQ</a>
            <a href="track-order.html">Track order</a>
            <a href="shipping.html">Shipping</a>
            <a href="returns.html">Returns</a>
          </nav>
        </div>
        <div class="mobile-menu-section">
          <h4>Theme</h4>
          <button class="btn btn-outline btn-sm btn-block" data-action="toggle-theme" style="margin-top:8px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            Toggle light / dark
          </button>
        </div>
        <div class="mobile-menu-section">
          <h4>Currency</h4>
          <select class="input" id="currency-select-mobile" style="margin-top:8px">
            ${Object.keys(CURRENCIES).map((c) => `<option value="${c}">${c} (${CURRENCIES[c].symbol})</option>`).join("")}
          </select>
        </div>
      </div>
    </aside>

    <aside class="drawer" id="cart-drawer" aria-hidden="true">
      <div class="drawer-header">
        <h3>Your cart</h3>
        <button class="drawer-close icon-btn" data-action="close-drawer" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="drawer-body" id="mini-cart-body"></div>
      <div class="drawer-footer" id="mini-cart-footer"></div>
    </aside>
  `;

  const cookieBanner = localStorage.getItem(COOKIE_KEY) === "1" ? "" : `
    <div class="cookie-banner" id="cookie-banner">
      <span>We use cookies to improve your experience. By using ShopFlow you agree to our <a href="privacy.html">Privacy Policy</a>.</span>
      <button class="btn btn-primary btn-sm" data-action="accept-cookies">Got it</button>
    </div>`;

  const slotHeader = document.getElementById("layout-header");
  const slotFooter = document.getElementById("layout-footer");
  if (slotHeader) slotHeader.innerHTML = header;
  if (slotFooter) slotFooter.innerHTML = footer + drawers + cookieBanner;

  // Highlight active nav link
  const page = (location.pathname.split("/").pop() || "index.html").split("?")[0];
  document.querySelectorAll(".nav-links a, .mobile-menu-links a").forEach((a) => {
    const aPage = (a.getAttribute("href") || "").split("?")[0];
    if (aPage === page) a.classList.add("active");
  });

  // Set current currency in selects
  document.querySelectorAll(".currency-select, #currency-select-mobile").forEach((sel) => {
    sel.value = currentCurrency();
  });

  Cart.updateBadge();
  Wishlist.updateBadge();

  // Reveal cookie banner after a tick
  if (localStorage.getItem(COOKIE_KEY) !== "1") {
    setTimeout(() => document.getElementById("cookie-banner")?.classList.add("show"), 800);
  }

  // Wire up the upgraded header (mega menu, instant search, social proof, compare bar)
  initMegaMenu();
  initInstantSearch();
  initCompareBar();
  initSocialProof();
  initQuickViewModal();
}

// ---- Mega menu ----
async function initMegaMenu() {
  const trigger = document.getElementById("megamenu-trigger");
  const menu = document.getElementById("megamenu");
  if (!trigger || !menu) return;

  try {
    const products = await loadProducts();
    const categories = [...new Set(products.map((p) => p.category))];
    document.getElementById("megamenu-categories").innerHTML = categories.map((c) => {
      const count = products.filter((p) => p.category === c).length;
      return `<a href="products.html?category=${encodeURIComponent(c)}">${escapeHtml(c)} <small>${count}</small></a>`;
    }).join("") + `<a href="products.html?sort=price_asc"><strong>All deals →</strong></a>`;

    const featured = products.filter((p) => p.badges?.includes("featured") || p.badges?.includes("best_seller")).slice(0, 4);
    document.getElementById("megamenu-featured").innerHTML = featured.map((p) => `
      <a class="megamenu-card" href="product.html?id=${p.id}">
        <div class="img"><img src="${productImage(p)}" alt="${escapeHtml(p.title)}" loading="lazy"/></div>
        <div class="info">
          <div class="label">${escapeHtml(p.title)}</div>
          <div class="price">${formatPrice(p.price)}</div>
        </div>
      </a>
    `).join("");
  } catch {}

  let hoverTimer;
  const open = () => {
    clearTimeout(hoverTimer);
    menu.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
  };
  const close = () => {
    hoverTimer = setTimeout(() => {
      menu.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }, 150);
  };
  trigger.addEventListener("mouseenter", open);
  trigger.addEventListener("focus", open);
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    menu.classList.contains("open") ? close() : open();
  });
  const wrap = document.getElementById("megamenu-wrap");
  wrap?.addEventListener("mouseleave", close);
  menu.addEventListener("mouseenter", () => clearTimeout(hoverTimer));
  menu.addEventListener("mouseleave", close);
}

// ---- Instant search dropdown ----
async function initInstantSearch() {
  const input = document.getElementById("instant-search");
  const dropdown = document.getElementById("search-dropdown");
  if (!input || !dropdown) return;

  let products = [];
  try { products = await loadProducts(); } catch { return; }

  let debounceTimer;
  function close() { dropdown.classList.remove("open"); }
  function render(query) {
    if (!query) { close(); return; }
    const q = query.toLowerCase();
    const matches = products
      .filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
      .slice(0, 6);

    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="search-empty">
        No results for "<strong>${escapeHtml(query)}</strong>".
        <div style="margin-top:8px"><a href="products.html?q=${encodeURIComponent(query)}" class="link">Browse all products →</a></div>
      </div>`;
    } else {
      const suggestions = [...new Set(matches.map((p) => p.category))].slice(0, 3);
      dropdown.innerHTML = `
        ${suggestions.length ? `<div class="search-suggest">Categories: ${suggestions.map((c) => `<a href="products.html?category=${encodeURIComponent(c)}" class="link" style="margin-right:8px">${escapeHtml(c)}</a>`).join("")}</div>` : ""}
        ${matches.map((p) => `
          <a href="product.html?id=${p.id}" class="search-result">
            <img src="${productImage(p)}" alt="${escapeHtml(p.title)}"/>
            <div>
              <div class="title">${escapeHtml(p.title)}</div>
              <div class="meta">${escapeHtml(p.brand)} · ${escapeHtml(p.category)}</div>
            </div>
            <div class="price">${formatPrice(p.price)}</div>
          </a>
        `).join("")}
        <a href="products.html?q=${encodeURIComponent(query)}" class="search-result" style="background:var(--bg-soft)">
          <div></div>
          <div class="title" style="font-weight:600">See all results for "${escapeHtml(query)}" →</div>
          <div></div>
        </a>
      `;
    }
    dropdown.classList.add("open");
  }

  input.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => render(e.target.value.trim()), 150);
  });
  input.addEventListener("focus", () => { if (input.value.trim()) render(input.value.trim()); });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#search-wrap")) close();
  });
}

// ---- Compare bar ----
function initCompareBar() {
  const bar = document.createElement("div");
  bar.className = "compare-bar hidden";
  bar.id = "compare-bar";
  document.body.appendChild(bar);

  const products = window._productsCache;
  async function render() {
    const ids = Compare.get();
    if (ids.length === 0) {
      bar.classList.add("hidden");
      return;
    }
    bar.classList.remove("hidden");
    const all = await loadProducts().catch(() => []);
    const items = ids.map((id) => all.find((p) => p.id === id)).filter(Boolean);
    const slots = [];
    for (let i = 0; i < Compare.MAX; i++) {
      const p = items[i];
      slots.push(p
        ? `<div class="slot"><img src="${productImage(p)}" alt="${escapeHtml(p.title)}"/><button data-compare-remove="${p.id}" aria-label="Remove">×</button></div>`
        : `<div class="slot empty">+</div>`);
    }
    bar.innerHTML = `
      <div class="compare-bar-items">${slots.join("")}</div>
      <a href="compare.html" class="btn btn-primary btn-sm">Compare (${items.length})</a>
      <button class="btn btn-ghost btn-sm" data-compare-clear>Clear</button>
    `;
  }
  render();
  document.addEventListener("compare:changed", render);
}

// ---- Social proof popup ----
async function initSocialProof() {
  if (sessionStorage.getItem("sp-shown") === "1") return;
  let products;
  try { products = await loadProducts(); } catch { return; }
  if (!products.length) return;

  const purchasers = [
    { name: "Maya R.", city: "New York, NY" },
    { name: "Aarav S.", city: "Mumbai, IN" },
    { name: "Lena K.", city: "Berlin, DE" },
    { name: "Diego M.", city: "Madrid, ES" },
    { name: "Priya P.", city: "Bangalore, IN" },
    { name: "Tomás L.", city: "Buenos Aires, AR" },
    { name: "Sara J.", city: "Toronto, CA" },
    { name: "Hiro N.", city: "Tokyo, JP" },
    { name: "Emily B.", city: "Sydney, AU" },
  ];

  let shown = 0;
  const MAX_SHOWN = 4;

  function showOne() {
    if (shown >= MAX_SHOWN) return;
    const product = products[Math.floor(Math.random() * products.length)];
    const buyer = purchasers[Math.floor(Math.random() * purchasers.length)];
    const minutes = Math.floor(Math.random() * 28) + 2;

    const el = document.createElement("div");
    el.className = "social-proof";
    el.innerHTML = `
      <img src="${productImage(product)}" alt="${escapeHtml(product.title)}"/>
      <div class="msg">
        <strong>${escapeHtml(buyer.name)} from ${escapeHtml(buyer.city)}</strong>
        just bought <a href="product.html?id=${product.id}" class="link">${escapeHtml(product.title)}</a>
        <div class="when">${minutes} min ago</div>
      </div>
    `;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("show"), 50);
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 400);
    }, 5500);

    shown++;
    if (shown < MAX_SHOWN) {
      setTimeout(showOne, 9000 + Math.random() * 6000);
    } else {
      sessionStorage.setItem("sp-shown", "1");
    }
  }

  setTimeout(showOne, 6000);
}

// ---- Quick view modal ----
function initQuickViewModal() {
  if (document.getElementById("quick-view")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "quick-view-backdrop";
  backdrop.id = "quick-view-backdrop";
  document.body.appendChild(backdrop);

  const modal = document.createElement("div");
  modal.className = "quick-view";
  modal.id = "quick-view";
  modal.innerHTML = `<button class="quick-view-close" data-action="close-quick-view" aria-label="Close">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  </button>`;
  document.body.appendChild(modal);

  backdrop.addEventListener("click", closeQuickView);
}

async function openQuickView(productId) {
  const modal = document.getElementById("quick-view");
  const backdrop = document.getElementById("quick-view-backdrop");
  if (!modal || !backdrop) return;
  let p;
  try {
    const products = await loadProducts();
    p = products.find((x) => x.id === productId);
  } catch {}
  if (!p) return;

  const disc = discountPercent(p);
  const stats = effectiveStats(p);
  const badges = [];
  if (disc > 0) badges.push(`<span class="badge sale">-${disc}%</span>`);
  if (p.badges?.includes("new")) badges.push(`<span class="badge new">New</span>`);
  if (p.badges?.includes("best_seller")) badges.push(`<span class="badge best">Best seller</span>`);

  modal.innerHTML = `
    <div class="quick-view-img">
      <div class="qv-badge-row">${badges.join("")}</div>
      <img src="${(p.images && p.images[0]) || p.image}" alt="${escapeHtml(p.title)}"/>
    </div>
    <div class="quick-view-info">
      <button class="quick-view-close" data-action="close-quick-view" aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="product-meta">${escapeHtml(p.brand)} · ${escapeHtml(p.category)}</div>
      <h2>${escapeHtml(p.title)}</h2>
      <div class="detail-rating">
        ${ratingStars(stats.rating, 14)}
        <span style="font-size:13px">${stats.rating.toFixed(1)} · ${stats.count} reviews</span>
      </div>
      <div style="font-size:24px;font-weight:700">${formatPrice(p.price)}
        ${p.compare_at ? `<span class="price-old">${formatPrice(p.compare_at)}</span>` : ""}
      </div>
      <p class="text-muted" style="margin:16px 0">${escapeHtml(p.short || "")}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" data-action="qv-add" data-id="${p.id}" ${p.in_stock ? "" : "disabled"}>
          ${p.in_stock ? "Add to cart" : "Out of stock"}
        </button>
        <a href="product.html?id=${p.id}" class="btn btn-outline">View full details →</a>
      </div>
    </div>
  `;
  document.getElementById("quick-view-backdrop").classList.add("open");
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeQuickView() {
  document.getElementById("quick-view")?.classList.remove("open");
  document.getElementById("quick-view-backdrop")?.classList.remove("open");
  document.body.style.overflow = "";
}

// ---- Drawer / menu open close ----
function openDrawer(id) {
  document.getElementById(id)?.classList.add("open");
  document.getElementById("drawer-backdrop")?.classList.add("open");
  document.body.style.overflow = "hidden";
  if (id === "cart-drawer") renderMiniCart();
}
function closeDrawer() {
  document.querySelectorAll(".drawer").forEach((d) => d.classList.remove("open"));
  document.getElementById("drawer-backdrop")?.classList.remove("open");
  document.body.style.overflow = "";
}

function renderMiniCart() {
  const items = Cart.get();
  const body = document.getElementById("mini-cart-body");
  const footer = document.getElementById("mini-cart-footer");
  if (!body || !footer) return;

  if (items.length === 0) {
    body.innerHTML = `<div class="mini-cart-empty">
      <p>Your cart is empty.</p>
      <a href="products.html" class="btn btn-primary" data-action="close-drawer">Browse products</a>
    </div>`;
    footer.innerHTML = "";
    return;
  }

  body.innerHTML = items.map((i) => `
    <div class="mini-cart-row">
      <a href="product.html?id=${i.id}"><img src="${i.image}" alt="${escapeHtml(i.title)}"/></a>
      <div>
        <a href="product.html?id=${i.id}" class="title">${escapeHtml(i.title)}</a>
        <div class="meta">${i.qty} × ${formatPrice(i.price)}</div>
      </div>
      <button class="remove" data-action="mini-cart-remove" data-id="${i.id}" aria-label="Remove">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </div>
  `).join("");

  const subtotal = Cart.subtotal();
  footer.innerHTML = `
    <div class="mini-cart-total"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
    <a href="cart.html" class="btn btn-primary btn-block">View cart</a>
    <a href="checkout.html" class="btn btn-outline btn-block" style="margin-top:8px">Checkout</a>
  `;
}

// ---- Global click handler ----
document.addEventListener("click", async (e) => {
  const target = e.target;
  const action = target.closest("[data-action]")?.dataset.action;

  if (action === "open-menu") { e.preventDefault(); openDrawer("menu-drawer"); return; }
  if (action === "open-cart") { e.preventDefault(); openDrawer("cart-drawer"); return; }
  if (action === "close-drawer") { e.preventDefault(); closeDrawer(); return; }
  if (action === "dismiss-promo") {
    localStorage.setItem(PROMO_BAR_KEY, "1");
    document.getElementById("promo-bar")?.classList.add("hidden");
    return;
  }
  if (action === "accept-cookies") {
    localStorage.setItem(COOKIE_KEY, "1");
    document.getElementById("cookie-banner")?.remove();
    return;
  }
  if (action === "mini-cart-remove") {
    const id = target.closest("[data-action]").dataset.id;
    Cart.remove(id);
    renderMiniCart();
    return;
  }
  if (action === "toggle-theme") {
    const next = Theme.toggle();
    toast(next === "dark" ? "Dark mode on" : "Light mode on");
    return;
  }
  if (action === "close-quick-view") { closeQuickView(); return; }
  if (action === "qv-add") {
    const id = target.closest("[data-action]").dataset.id;
    try {
      const products = await loadProducts();
      const p = products.find((x) => x.id === id);
      if (!p || !p.in_stock) return;
      Cart.add(p, 1);
      closeQuickView();
      openDrawer("cart-drawer");
    } catch {}
    return;
  }

  // Backdrop click closes drawers
  if (target.id === "drawer-backdrop") { closeDrawer(); return; }

  // Quick view (from product card)
  const qvBtn = target.closest("[data-quick-view]");
  if (qvBtn) {
    e.preventDefault();
    openQuickView(qvBtn.dataset.quickView);
    return;
  }

  // Compare toggle
  const compareInput = target.closest("[data-compare]");
  if (compareInput && target.tagName === "INPUT") {
    const id = compareInput.dataset.compare;
    const added = Compare.toggle(id);
    if (!added && Compare.has(id)) compareInput.checked = true;
    else compareInput.checked = Compare.has(id);
    document.querySelector(`[data-compare-label="${id}"]`)?.classList.toggle("active", Compare.has(id));
    return;
  }

  // Compare remove
  const cmpRm = target.closest("[data-compare-remove]");
  if (cmpRm) {
    Compare.remove(cmpRm.dataset.compareRemove);
    return;
  }
  if (target.closest("[data-compare-clear]")) {
    Compare.clear();
    return;
  }

  // Wishlist toggle (from product cards)
  const wishBtn = target.closest("[data-wishlist]");
  if (wishBtn) {
    e.preventDefault();
    const id = wishBtn.dataset.wishlist;
    const isOn = Wishlist.toggle(id);
    wishBtn.classList.toggle("active", isOn);
    toast(isOn ? "Added to wishlist" : "Removed from wishlist");
    return;
  }

  // Add to cart (from product cards)
  const addBtn = target.closest("[data-add]");
  if (addBtn) {
    e.preventDefault();
    const id = addBtn.dataset.add;
    try {
      const products = await loadProducts();
      const p = products.find((x) => x.id === id);
      if (!p || !p.in_stock) return;
      Cart.add(p, 1);
      openDrawer("cart-drawer");
    } catch {
      toast("Could not add to cart");
    }
    return;
  }
});

// ---- Escape closes drawers ----
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

// ---- Currency switcher events ----
document.addEventListener("change", (e) => {
  if (e.target.matches(".currency-select, #currency-select-mobile")) {
    setCurrency(e.target.value);
    location.reload(); // simple: re-render every price on the page
  }
});

// ---- Newsletter forms ----
document.addEventListener("submit", (e) => {
  if (e.target.matches("[data-newsletter]")) {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    if (!email) return;
    e.target.reset();
    toast(`Subscribed: ${email}. Use code WELCOME10 for 10% off!`);
  }
});

// ---- Mark up year stamps ----
function stampYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

// ---- Service worker (PWA + offline-tolerant) ----
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// ---- Estimated delivery date (cart/checkout) ----
function estimatedDelivery(country = "US", method = "standard") {
  const days = method === "express" ? [1, 2]
    : (country === "US" || country === "United States") ? [3, 5]
    : (country === "Canada" || country === "United Kingdom" || country === "EU") ? [4, 7]
    : [7, 14];
  const fromDate = new Date(Date.now() + days[0] * 86400000);
  const toDate = new Date(Date.now() + days[1] * 86400000);
  const fmt = (d) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `${fmt(fromDate)} – ${fmt(toDate)}`;
}

// ---- Loyalty points formula (1pt per $1 spent) ----
function pointsForCart() {
  return Math.floor(Cart.subtotal());
}

// ---- Boot ----
document.addEventListener("DOMContentLoaded", () => {
  renderLayout();
  stampYear();
});

// Re-render mini cart when cart changes (in case drawer is open)
document.addEventListener("cart:changed", () => {
  if (document.getElementById("cart-drawer")?.classList.contains("open")) {
    renderMiniCart();
  }
});
