// Order tracking page
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("track-form");
  const result = document.getElementById("track-result");
  if (!form) return;

  // Auto-fill if last order in this session
  const last = sessionStorage.getItem("lastOrder");
  if (last) {
    try {
      const o = JSON.parse(last);
      form.querySelector("[name=orderId]").value = o.id;
      form.querySelector("[name=email]").value = o.email;
    } catch {}
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const orderId = form.querySelector("[name=orderId]").value.trim().toUpperCase();
    const email = form.querySelector("[name=email]").value.trim();
    if (!orderId || !email) { toast("Order ID and email required"); return; }

    // Fake tracking: derive a status from the order ID's hash for consistency
    const seed = orderId.split("").reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 0);
    const stages = ["placed", "processing", "shipped", "out_for_delivery"];
    const stage = seed % stages.length;
    const labels = ["Pending", "Processing", "Shipped", "Out for delivery"];
    const dates = Array.from({ length: stage + 1 }).map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (stage - i)); return d.toDateString();
    });

    result.hidden = false;
    result.innerHTML = `
      <div class="form-card">
        <h3>Order ${escapeHtml(orderId)}</h3>
        <p class="text-muted" style="margin-top:0">Email: ${escapeHtml(email)}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0">
          ${stages.map((s, i) => `
            <div style="flex:1;min-width:120px;text-align:center;padding:12px;border:1px solid ${i <= stage ? "var(--ink)" : "var(--border)"};border-radius:8px;background:${i <= stage ? "var(--bg-soft)" : "transparent"}">
              <div style="font-size:11px;text-transform:uppercase;color:${i <= stage ? "var(--success)" : "var(--muted)"};font-weight:700">
                ${i < stage ? "✓ " : i === stage ? "● " : ""}${labels[i]}
              </div>
              ${dates[i] ? `<div style="font-size:11px;margin-top:4px;color:var(--ink-soft)">${dates[i]}</div>` : ""}
            </div>
          `).join("")}
        </div>
        <p>Estimated delivery: <strong>${new Date(Date.now() + (3-stage+1)*86400000).toDateString()}</strong></p>
        <p class="text-muted" style="font-size:13px">This is a demo storefront — tracking data is illustrative.</p>
      </div>
    `;
  });
});
