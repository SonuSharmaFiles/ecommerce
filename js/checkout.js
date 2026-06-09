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

  const subtotal = Cart.subtotal();
  const promo = Promo.get();
  const discount = Promo.discount(subtotal);
  const shippingRaw = subtotal >= 75 ? 0 : 7.50;
  const shipping = (promo?.kind === "free_ship") ? 0 : shippingRaw;
  const tax = +((subtotal - discount) * 0.08).toFixed(2);
  const total = subtotal - discount + shipping + tax;

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
    ${discount > 0 ? `<div class="summary-row" style="color:var(--success)"><span>Discount (${promo.code})</span><span>−${formatPrice(discount)}</span></div>` : ""}
    <div class="summary-row"><span class="muted">Shipping</span><span>${shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
    <div class="summary-row"><span class="muted">Tax (est.)</span><span>${formatPrice(tax)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>

    <div class="checkout-trust">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <span>Secure SSL checkout — your data is encrypted</span>
    </div>
    <div class="payment-logos" style="margin-top:8px">
      <span class="pay-pill">VISA</span>
      <span class="pay-pill">MC</span>
      <span class="pay-pill">AMEX</span>
      <span class="pay-pill">PAYPAL</span>
      <span class="pay-pill">APPLE</span>
      <span class="pay-pill">GPAY</span>
    </div>
  `;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const required = ["email", "fullName", "line1", "city", "postalCode", "country"];
    for (const r of required) {
      if (!data.get(r)) { toast(`Please fill in: ${r}`); return; }
    }
    const orderId = "SF-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    Cart.clear();
    sessionStorage.setItem("lastOrder", JSON.stringify({
      id: orderId, email: data.get("email"), total,
    }));
    location.href = `thank-you.html?id=${orderId}`;
  });
});
