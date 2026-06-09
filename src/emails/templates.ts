// Hand-rolled HTML templates. (React Email could be added later;
// keeping zero-dep here so this file works without an extra build step.)

import { APP_NAME, APP_URL } from "@/lib/constants";

interface OrderEmailRow {
  order_number: string;
  email: string;
  total: number | string;
  currency: string;
  shipping_address?: { full_name?: string; city?: string; country?: string } | null;
}

function wrap(inner: string, preheader: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${APP_NAME}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;background:#f7f7f8;color:#0f172a}
  .wrap{max-width:560px;margin:0 auto;padding:32px 20px}
  .card{background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  h1{font-size:22px;margin:0 0 16px;color:#0f172a}
  .brand{font-weight:700;font-size:18px;color:#0f172a;text-decoration:none}
  .muted{color:#64748b;font-size:14px}
  .cta{display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;margin-top:16px}
  .hr{border-top:1px solid #e2e8f0;margin:24px 0}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
</style></head><body>
<div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
<div class="wrap">
  <a href="${APP_URL}" class="brand">${APP_NAME}</a>
  <div class="card" style="margin-top:16px">
    ${inner}
  </div>
  <p class="muted" style="text-align:center;margin-top:24px">© ${new Date().getFullYear()} ${APP_NAME}</p>
</div></body></html>`;
}

export function renderWelcome(args: { name: string; couponCode?: string }) {
  const inner = `
    <h1>Welcome to ${APP_NAME}, ${args.name}</h1>
    <p>Glad you're here. Your account is ready, and the store is yours to browse.</p>
    ${args.couponCode ? `<p style="margin-top:16px;padding:14px;background:#f1f5f9;border-radius:8px">
      Use code <b>${args.couponCode}</b> for <b>10% off</b> your first order.
    </p>` : ""}
    <a class="cta" href="${APP_URL}/products">Start shopping</a>`;
  return wrap(inner, "Welcome aboard — your account is ready.");
}

export function renderOrderConfirmation(order: OrderEmailRow) {
  const total = typeof order.total === "string" ? order.total : order.total.toFixed(2);
  const inner = `
    <h1>Order ${order.order_number} confirmed</h1>
    <p>Thanks for your order. We'll email you again when it ships.</p>
    <div class="hr"></div>
    <table>
      <tr><th>Order</th><td>${order.order_number}</td></tr>
      <tr><th>Total</th><td>${order.currency} ${total}</td></tr>
      ${order.shipping_address?.full_name ? `<tr><th>Ship to</th><td>${order.shipping_address.full_name}, ${order.shipping_address.city ?? ""} ${order.shipping_address.country ?? ""}</td></tr>` : ""}
    </table>
    <a class="cta" href="${APP_URL}/account/orders">View order</a>`;
  return wrap(inner, `Order ${order.order_number} confirmed.`);
}

export function renderShippingNotice(args: {
  orderNumber: string; carrier?: string; trackingNumber?: string; trackingUrl?: string;
}) {
  const inner = `
    <h1>Your order is on the way</h1>
    <p>Order <b>${args.orderNumber}</b> has shipped.</p>
    <table>
      ${args.carrier ? `<tr><th>Carrier</th><td>${args.carrier}</td></tr>` : ""}
      ${args.trackingNumber ? `<tr><th>Tracking</th><td>${args.trackingNumber}</td></tr>` : ""}
    </table>
    ${args.trackingUrl ? `<a class="cta" href="${args.trackingUrl}">Track shipment</a>` : ""}`;
  return wrap(inner, `Your order ${args.orderNumber} is shipping.`);
}

export function renderAbandonedCart(args: { name?: string; cartUrl: string; itemsHtml?: string }) {
  const inner = `
    <h1>${args.name ? `${args.name}, you ` : "You "}left something behind</h1>
    <p>Your cart's still waiting for you. Pick up where you left off.</p>
    ${args.itemsHtml ?? ""}
    <a class="cta" href="${args.cartUrl}">Return to cart</a>`;
  return wrap(inner, "Your cart is waiting for you.");
}

export function renderPasswordReset(args: { resetUrl: string }) {
  const inner = `
    <h1>Reset your password</h1>
    <p>Click the button below to choose a new password. The link expires in 30 minutes.</p>
    <a class="cta" href="${args.resetUrl}">Reset password</a>
    <p class="muted" style="margin-top:16px">If you didn't request this, you can ignore this email.</p>`;
  return wrap(inner, "Reset your password.");
}
