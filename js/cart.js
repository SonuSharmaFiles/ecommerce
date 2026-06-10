// Cart page — items, promo, save-for-later, delivery estimate, upsell
document.addEventListener("DOMContentLoaded", () => {
  render();
  document.addEventListener("cart:changed", render);
  document.addEventListener("saved:changed", render);
  document.addEventListener("currency:changed", render);

  async function render() {
    const layout = document.getElementById("cart-layout");
    const empty = document.getElementById("cart-empty");
    const items = Cart.get();
    const saved = Saved.get();

    if (items.length === 0 && saved.length === 0) {
      layout.hidden = true; empty.hidden = false;
      return;
    }
    layout.hidden = false; empty.hidden = true;

    // Cart items
    const list = document.getElementById("cart-items");
    if (items.length === 0) {
      list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--ink-soft)">Your cart is empty. Move items here from your saved list.</div>`;
    } else {
      list.innerHTML = items.map((i) => `
        <div class="cart-row" data-row="${i.id}">
          <a href="product.html?id=${i.id}"><img src="${i.image}" alt="${escapeHtml(i.title)}"/></a>
          <div>
            <a href="product.html?id=${i.id}" class="title">${escapeHtml(i.title)}</a>
            <div class="meta">${formatPrice(i.price)}</div>
            <div class="row-bottom">
              <div class="qty-row">
                <button data-decrease="${i.id}" aria-label="Decrease">−</button>
                <span>${i.qty}</span>
                <button data-increase="${i.id}" aria-label="Increase">+</button>
              </div>
              <button class="move-later" data-move-later="${i.id}">Save for later</button>
              <button class="remove" data-remove="${i.id}">Remove</button>
            </div>
          </div>
          <div class="line-total">${formatPrice(i.price * i.qty)}</div>
        </div>
      `).join("");
    }

    const subtotal = Cart.subtotal();
    const promo = Promo.get();
    const discount = Promo.discount(subtotal);
    const freeShipThreshold = 75;
    const shippingRaw = subtotal >= freeShipThreshold || subtotal === 0 ? 0 : 7.50;
    const shipping = (promo?.kind === "free_ship") ? 0 : shippingRaw;
    const total = subtotal - discount + shipping;

    document.getElementById("sum-subtotal").textContent = formatPrice(subtotal);
    document.getElementById("sum-shipping").textContent = shipping === 0 ? "Free" : formatPrice(shipping);
    document.getElementById("sum-total").textContent = formatPrice(total);

    // Discount row
    const discRow = document.getElementById("sum-discount-row");
    if (discount > 0) {
      discRow.style.display = "flex";
      document.getElementById("sum-discount").textContent = `−${formatPrice(discount)}`;
    } else discRow.style.display = "none";

    // Free shipping bar
    const bar = document.getElementById("free-ship-bar");
    if (subtotal >= freeShipThreshold) {
      bar.innerHTML = `🎉 You unlocked free shipping!`;
    } else {
      const pct = (subtotal / freeShipThreshold) * 100;
      bar.innerHTML = `
        Add <strong>${formatPrice(freeShipThreshold - subtotal)}</strong> for free shipping.
        <div class="bar"><span style="width:${pct}%"></span></div>
      `;
    }

    // Delivery estimate
    const delivery = document.getElementById("delivery-estimate");
    if (delivery && items.length > 0) {
      delivery.innerHTML = `
        <strong>Get it ${estimatedDelivery("US", "standard")}</strong>
        with free standard shipping
      `;
      delivery.style.display = "block";
    } else if (delivery) {
      delivery.style.display = "none";
    }

    // Loyalty preview
    const loyaltyEl = document.getElementById("loyalty-preview");
    if (loyaltyEl) {
      const pts = pointsForCart();
      loyaltyEl.innerHTML = pts > 0
        ? `<div class="loyalty-banner"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><div class="text"><strong>You'll earn ${pts} points</strong> on this order</div></div>`
        : "";
    }

    // Promo applied UI
    const promoBox = document.getElementById("promo-box");
    if (promo) {
      promoBox.innerHTML = `
        <div class="promo-applied">
          <span>✓ <strong>${promo.code}</strong> · ${escapeHtml(promo.label)}</span>
          <button data-remove-promo aria-label="Remove">Remove</button>
        </div>
      `;
    } else {
      promoBox.innerHTML = `
        <div class="promo-input">
          <input type="text" id="promo-code" placeholder="Promo code (try WELCOME10)" />
          <button class="btn btn-outline btn-sm" id="apply-promo">Apply</button>
        </div>
      `;
    }

    // Saved for later
    const savedSlot = document.getElementById("saved-slot");
    if (savedSlot) {
      if (saved.length === 0) {
        savedSlot.innerHTML = "";
      } else {
        savedSlot.innerHTML = `
          <div class="save-later-section">
            <h3>Saved for later (${saved.length})</h3>
            ${saved.map((i) => `
              <div class="save-later-row">
                <a href="product.html?id=${i.id}"><img src="${i.image}" alt="${escapeHtml(i.title)}"/></a>
                <div>
                  <a href="product.html?id=${i.id}" class="title">${escapeHtml(i.title)}</a>
                  <div class="meta">${formatPrice(i.price)}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
                  <button class="btn btn-primary btn-sm" data-move-cart="${i.id}">Move to cart</button>
                  <button class="remove" data-remove-saved="${i.id}" style="font-size:11px;background:transparent;border:0;color:var(--ink-soft);cursor:pointer">Remove</button>
                </div>
              </div>
            `).join("")}
          </div>
        `;
      }
    }

    // Upsell: best sellers not in cart
    try {
      const products = await loadProducts();
      const ids = new Set([...items.map((i) => i.id), ...saved.map((i) => i.id)]);
      const upsell = products.filter((p) => !ids.has(p.id) && p.badges?.includes("best_seller")).slice(0, 4);
      const upEl = document.getElementById("upsell-grid");
      const upSec = document.getElementById("upsell-section");
      if (upEl) {
        if (upsell.length) upEl.innerHTML = upsell.map(productCardHTML).join("");
        else if (upSec) upSec.style.display = "none";
      }
    } catch {}
  }

  document.addEventListener("click", (e) => {
    const inc = e.target.closest("[data-increase]");
    const dec = e.target.closest("[data-decrease]");
    const rm = e.target.closest("[data-remove]");
    const apply = e.target.closest("#apply-promo");
    const rmp = e.target.closest("[data-remove-promo]");
    const ml = e.target.closest("[data-move-later]");
    const mc = e.target.closest("[data-move-cart]");
    const rms = e.target.closest("[data-remove-saved]");

    if (inc) {
      const item = Cart.get().find((i) => i.id === inc.dataset.increase);
      if (item) Cart.updateQty(item.id, item.qty + 1);
    } else if (dec) {
      const item = Cart.get().find((i) => i.id === dec.dataset.decrease);
      if (item && item.qty > 1) Cart.updateQty(item.id, item.qty - 1);
      else if (item) Cart.remove(item.id);
    } else if (rm) {
      Cart.remove(rm.dataset.remove);
      toast("Removed from cart");
    } else if (apply) {
      const code = document.getElementById("promo-code").value;
      const result = Promo.apply(code);
      if (!result.ok) toast(result.error);
      else toast(`Applied ${code.toUpperCase()}`);
    } else if (rmp) {
      Promo.clear();
      toast("Promo removed");
    } else if (ml) {
      const id = ml.dataset.moveLater;
      const item = Cart.get().find((i) => i.id === id);
      if (item) {
        Saved.add({ id: item.id, title: item.title, price: item.price, image: item.image });
        Cart.remove(id);
        toast("Saved for later");
      }
    } else if (mc) {
      const id = mc.dataset.moveCart;
      const item = Saved.get().find((i) => i.id === id);
      if (item) {
        Cart.add({ id: item.id, title: item.title, price: item.price, image: item.image }, 1);
        Saved.remove(id);
        toast("Moved to cart");
      }
    } else if (rms) {
      Saved.remove(rms.dataset.removeSaved);
      toast("Removed from saved");
    }
  });
});
