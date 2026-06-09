const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

interface TokenCache { token: string; expiresAt: number }
let tokenCache: TokenCache | null = null;

export function isPayPalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal credentials missing");
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal token failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return tokenCache.token;
}

export interface CreateOrderArgs {
  orderId: string;
  amount: number;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
}

export async function createPayPalOrder(args: CreateOrderArgs) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: args.orderId,
          amount: { currency_code: args.currency.toUpperCase(), value: args.amount.toFixed(2) },
        },
      ],
      application_context: {
        return_url: args.returnUrl,
        cancel_url: args.cancelUrl,
        brand_name: process.env.NEXT_PUBLIC_APP_NAME ?? "ShopFlow",
        user_action: "PAY_NOW",
        shipping_preference: "GET_FROM_FILE",
      },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal order create failed: ${res.status}`);
  return res.json();
}

export async function capturePayPalOrder(paypalOrderId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal capture failed: ${res.status}`);
  return res.json();
}

export async function refundPayPalCapture(captureId: string, amount?: number, currency = "USD") {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: amount ? JSON.stringify({ amount: { value: amount.toFixed(2), currency_code: currency } }) : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal refund failed: ${res.status}`);
  return res.json();
}
