// Shared utilities and global behavior

const CART_KEY = "shopflow-cart";
const WISHLIST_KEY = "shopflow-wishlist";
const CURRENCY = "USD";

const formatPrice = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY }).format(n);

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
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        qty,
      });
    }
    Cart.set(items);
  },
  updateQty(id, qty) {
    const items = Cart.get().map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i));
    Cart.set(items);
  },
  remove(id) {
    Cart.set(Cart.get().filter((i) => i.id !== id));
  },
  clear() {
    Cart.set([]);
  },
  count() {
    return Cart.get().reduce((s, i) => s + i.qty, 0);
  },
  subtotal() {
    return Cart.get().reduce((s, i) => s + i.price * i.qty, 0);
  },
  updateBadge() {
    document.querySelectorAll(".cart-count").forEach((el) => {
      const n = Cart.count();
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  },
};

const Wishlist = {
  get() {
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; }
    catch { return []; }
  },
  set(ids) { localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids)); },
  has(id) { return Wishlist.get().includes(id); },
  toggle(id) {
    const list = Wishlist.get();
    if (list.includes(id)) {
      Wishlist.set(list.filter((x) => x !== id));
      return false;
    }
    Wishlist.set([...list, id]);
    return true;
  },
};

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

async function loadProducts() {
  const res = await fetch("data/products.json");
  if (!res.ok) throw new Error("Could not load products");
  return res.json();
}

function productImage(p) {
  return p.image || (p.images && p.images[0]) || "";
}

function discountPercent(p) {
  if (!p.compare_at || p.compare_at <= p.price) return 0;
  return Math.round(((p.compare_at - p.price) / p.compare_at) * 100);
}

function ratingStars(rating) {
  const full = Math.round(rating);
  let s = "";
  for (let i = 0; i < 5; i++) {
    s += i < full
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z"/></svg>`
      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z"/></svg>`;
  }
  return s;
}

function productCardHTML(p) {
  const disc = discountPercent(p);
  const badges = [];
  if (disc > 0) badges.push(`<span class="badge sale">-${disc}%</span>`);
  if (p.badges?.includes("new")) badges.push(`<span class="badge new">New</span>`);
  if (p.badges?.includes("best_seller")) badges.push(`<span class="badge best">Best seller</span>`);

  const inWishlist = Wishlist.has(p.id);

  return `
    <article class="product-card">
      <a href="product.html?id=${p.id}" class="product-media">
        <img src="${productImage(p)}" alt="${escapeHtml(p.title)}" loading="lazy" />
        <div class="product-badges">${badges.join("")}</div>
      </a>
      <button class="wishlist-btn ${inWishlist ? "active" : ""}" data-wishlist="${p.id}" aria-label="Toggle wishlist" title="Wishlist">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
      <div class="product-body">
        <div class="product-meta">${escapeHtml(p.brand)} · ${escapeHtml(p.category)}</div>
        <a href="product.html?id=${p.id}" class="product-title">${escapeHtml(p.title)}</a>
        <div class="product-rating">${ratingStars(p.rating)} <span>${p.rating.toFixed(1)} (${p.ratings_count})</span></div>
        <div class="product-bottom">
          <div>
            <span class="price-now">${formatPrice(p.price)}</span>
            ${p.compare_at ? `<span class="price-old">${formatPrice(p.compare_at)}</span>` : ""}
          </div>
          <button class="add-btn" data-add="${p.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            Add
          </button>
        </div>
      </div>
    </article>
  `;
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Global click handlers — delegated
document.addEventListener("click", async (e) => {
  const wishBtn = e.target.closest("[data-wishlist]");
  if (wishBtn) {
    e.preventDefault();
    const id = wishBtn.dataset.wishlist;
    const isOn = Wishlist.toggle(id);
    wishBtn.classList.toggle("active", isOn);
    toast(isOn ? "Added to wishlist" : "Removed from wishlist");
    return;
  }

  const addBtn = e.target.closest("[data-add]");
  if (addBtn) {
    e.preventDefault();
    const id = addBtn.dataset.add;
    try {
      const products = await (window._productsCache || (window._productsCache = loadProducts()));
      const p = products.find((x) => x.id === id);
      if (!p) return;
      Cart.add(p, 1);
      toast(`Added "${p.title}" to cart`);
    } catch {
      toast("Could not add to cart");
    }
    return;
  }
});

// Year stamp + cart badge on every page
document.addEventListener("DOMContentLoaded", () => {
  Cart.updateBadge();
  const y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  // Highlight active nav link
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path) a.classList.add("active");
  });

  // Newsletter forms
  document.querySelectorAll("[data-newsletter]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]').value;
      if (!email) return;
      form.reset();
      toast(`Subscribed: ${email}`);
    });
  });
});
