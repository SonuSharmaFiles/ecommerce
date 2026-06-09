// Cart page rendering
document.addEventListener("DOMContentLoaded", () => {
  render();
  document.addEventListener("cart:changed", render);

  function render() {
    const layout = document.getElementById("cart-layout");
    const empty = document.getElementById("cart-empty");
    const items = Cart.get();
    if (items.length === 0) {
      layout.hidden = true;
      empty.hidden = false;
      return;
    }
    layout.hidden = false;
    empty.hidden = true;

    const list = document.getElementById("cart-items");
    list.innerHTML = items.map((i) => `
      <div class="cart-row" data-row="${i.id}">
        <img src="${i.image}" alt="${escapeHtml(i.title)}"/>
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
    const shipping = subtotal >= 75 || subtotal === 0 ? 0 : 7.50;
    const total = subtotal + shipping;
    document.getElementById("sum-subtotal").textContent = formatPrice(subtotal);
    document.getElementById("sum-shipping").textContent = shipping === 0 ? "Free" : formatPrice(shipping);
    document.getElementById("sum-total").textContent = formatPrice(total);
    document.getElementById("free-ship-note").textContent =
      subtotal < 75 ? `Add ${formatPrice(75 - subtotal)} for free shipping.` : "You unlocked free shipping!";
  }

  document.addEventListener("click", (e) => {
    const inc = e.target.closest("[data-increase]");
    const dec = e.target.closest("[data-decrease]");
    const rm = e.target.closest("[data-remove]");
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
    }
  });
});
