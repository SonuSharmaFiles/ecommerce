// Cart page
document.addEventListener("DOMContentLoaded", () => {
  render();
  document.addEventListener("cart:changed", render);
  document.addEventListener("currency:changed", render);

  async function render() {
    const layout = document.getElementById("cart-layout");
    const empty = document.getElementById("cart-empty");
    const items = Cart.get();
    if (items.length === 0) {
      layout.hidden = true; empty.hidden = false;
      return;
    }
    layout.hidden = false; empty.hidden = true;

    const list = document.getElementById("cart-items");
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
            <button class="remove" data-remove="${i.id}">Remove</button>
          </div>
        </div>
        <div class="line-total">${formatPrice(i.price * i.qty)}</div>
      </div>
    `).join("");

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

    // Upsell: best sellers not in cart
    try {
      const products = await loadProducts();
      const ids = new Set(items.map((i) => i.id));
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
    }
  });
});
