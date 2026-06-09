// Checkout page
document.addEventListener("DOMContentLoaded", () => {
  const items = Cart.get();
  const summary = document.getElementById("checkout-summary");
  const form = document.getElementById("checkout-form");

  if (items.length === 0) {
    document.getElementById("checkout-layout").innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <h2>Your cart is empty</h2>
        <p>Add a product to checkout.</p>
        <a class="btn btn-primary" href="products.html">Browse products</a>
      </div>
    `;
    return;
  }

  // Summary
  const subtotal = Cart.subtotal();
  const shipping = subtotal >= 75 ? 0 : 7.50;
  const tax = +(subtotal * 0.08).toFixed(2);
  const total = subtotal + shipping + tax;

  summary.innerHTML = `
    <h3>Order summary</h3>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
      ${items.map((i) => `
        <div class="summary-row">
          <span>${i.qty}× ${escapeHtml(i.title)}</span>
          <span>${formatPrice(i.price * i.qty)}</span>
        </div>
      `).join("")}
    </div>
    <div class="summary-row"><span class="muted">Subtotal</span><span>${formatPrice(subtotal)}</span></div>
    <div class="summary-row"><span class="muted">Shipping</span><span>${shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
    <div class="summary-row"><span class="muted">Tax (est.)</span><span>${formatPrice(tax)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>
  `;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const required = ["email", "fullName", "line1", "city", "postalCode", "country"];
    for (const r of required) {
      if (!data.get(r)) { toast(`Missing: ${r}`); return; }
    }

    // Fake order placement
    const orderId = "SF-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    Cart.clear();
    sessionStorage.setItem("lastOrder", JSON.stringify({
      id: orderId, email: data.get("email"), total,
    }));
    location.href = `thank-you.html?id=${orderId}`;
  });
});
