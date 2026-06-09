# API reference

All endpoints under `/api/*`. Authentication via Supabase session cookies. Admin endpoints additionally require `admin.access` role.

## Public

### `POST /api/newsletter`
Body: `{ email, source? }` → `{ ok: true }`

### `GET /api/orders/track?orderNumber=&email=`
→ `{ order_number, status, tracking_url, events: [...] }` or 404

### `GET /api/coupons/{code}?subtotal=`
→ `{ ok, discount, free_shipping, message }`

### `POST /api/reviews`
Auth required. Body: `{ product_id, rating, title?, body? }` → `{ ok }`

### `POST /api/analytics/track`
Body: `{ event_name, url?, properties?, ... }` → `{ ok }`

## Cart & orders

### `GET /api/cart` → `{ cart, lines }`
### `POST /api/cart/items` — body `{ product_id, variant_id?, quantity }`
### `DELETE /api/cart/items?id=`
### `POST /api/orders` — creates order, returns `{ orderId, orderNumber, total }`

## Payments

### `POST /api/payments/stripe/create` — body `{ orderId }` → `{ clientSecret, intentId }`
### `POST /api/payments/paypal/create` — body `{ orderId }` → `{ approveUrl, paypalOrderId }`
### `GET /api/payments/paypal/capture?orderId=&token=` — redirect from PayPal approval
### `POST /api/webhooks/stripe` — signature-verified
### `POST /api/webhooks/paypal`

## AI (rate-limited to 20/min per IP)

### `POST /api/ai/product-description`
Body: `{ title, bullets?, audience?, tone?, language? }`
→ `{ title, short_description, description, seo_title, seo_description, keywords }`

### `POST /api/ai/seo`
Body: `{ topic, target? }`
→ `{ title, description, keywords, faqs }`

### `POST /api/ai/faq`
Body: `{ title, description? }` → `{ faqs: [{q, a}] }`

### `POST /api/ai/chat`
Body: `{ sessionId?, message }` → `{ sessionId, reply }`

## Admin (RBAC: requires `admin.access`)

### `POST /api/admin/products` — create product
### `PATCH /api/admin/orders/{id}` — update order status / tracking
### `POST /api/admin/orders/{id}/refund` — issue refund (requires `order.refund`)
### `POST /api/admin/coupons` — create coupon
### `GET /api/dropshipping/search?provider=&q=`
### `POST /api/dropshipping/import` — body `{ provider, externalId, markupPercent? }`
### `POST /api/dropshipping/sync` — body `{ supplierId }`

## Cron (requires `Authorization: Bearer ${CRON_SECRET}`)

### `GET /api/cron/exchange-rates` — refresh FX rates
### `GET /api/cron/abandoned-carts` — send abandoned-cart emails
### `GET /api/cron/dropshipping-sync` — sync supplier prices & stock

## Auth

### `GET /auth/callback?code=&next=` — Supabase OAuth callback
### `POST /api/auth/logout` — signs out + redirects to `/`

## Rate limits

| Endpoint | Limit |
|---|---|
| `/api/auth/*` | 10 req / min per IP |
| `/api/ai/*` | 20 req / min per IP |
| Other `/api/*` | 120 req / min per IP |

Returns `429` on excess.

## Errors

All endpoints return JSON: `{ error: string | object }` with status 400/401/403/404/429/500.

## Conventions

- Times in ISO-8601 UTC
- Money: `{ amount: number, currency: string }` where amount is a decimal in major units (`19.99` not `1999`)
- IDs: UUID v4 (except `order_number` which is human-readable `SF-2026-000123`)
