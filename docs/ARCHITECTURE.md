# Architecture

## Layers

```
┌──────────────────────────────────────────────────────────┐
│   App Router (Next.js 15, RSC by default)                │
│   ├─ /(storefront)  customer pages (i18n-aware)          │
│   ├─ /admin         RBAC-gated dashboard                 │
│   ├─ /auth          Supabase auth flows                  │
│   └─ /api           route handlers (REST)                │
├──────────────────────────────────────────────────────────┤
│   lib/   business logic & integrations                   │
│   ├─ supabase/  3 clients (browser, server, admin)       │
│   ├─ ai/        Claude SDK + prompts                     │
│   ├─ dropshipping/  typed CJ + AutoDS adapters           │
│   ├─ stripe / paypal / resend / sms                      │
│   ├─ cart / orders / products / currency                 │
│   └─ rbac / seo / schema-org / validators                │
├──────────────────────────────────────────────────────────┤
│   stores/   Zustand client state (cart, wishlist, UI)    │
│   hooks/    React hooks (debounce, media query, …)       │
├──────────────────────────────────────────────────────────┤
│   middleware.ts  rate-limit + locale + RBAC routing      │
├──────────────────────────────────────────────────────────┤
│   supabase/migrations  9 SQL files (idempotent)          │
│   types/database.ts    matching TS types                 │
└──────────────────────────────────────────────────────────┘
```

## Data flow: place an order

```
[Cart]
  └─ POST /api/orders                creates order + items, status=pending
       └─ Returns orderId
[Checkout]
  ├─ POST /api/payments/stripe/create   → creates PaymentIntent, returns client_secret
  ├─ Stripe Elements collects card
  ├─ stripe.confirmPayment              → user redirected to thank-you
  └─ Asynchronously:
       Stripe sends payment_intent.succeeded
       └─ POST /api/webhooks/stripe (signature-verified, deduped by event id)
            └─ lib/orders.markOrderPaid:
                 ├─ INSERT payments row
                 ├─ UPDATE orders SET payment_status='paid', status='processing'
                 ├─ INSERT order_event 'processing'
                 └─ sendEmail order_confirmation
```

## Auth + RBAC

- `auth.users` (Supabase managed) → trigger creates `public.profiles` row
- Roles: `customer < support < editor < manager < admin < super_admin`
- `middleware.ts` blocks `/admin/*` for non-staff
- Server components call `requireAdmin()` / `requirePermission(key)` from `lib/rbac.ts`
- Server-side mutations go through the **service role client** (`lib/supabase/admin.ts`), bypassing RLS
- Public reads go through the anon-key server client (`lib/supabase/server.ts`) with RLS enforced

## Caching strategy

- **Static pages** (homepage, blog index): `revalidate = 300`
- **Product pages**: `revalidate = 60`
- **Catalog search**: `revalidate = 60`
- **Admin pages**: `force-dynamic` (always fresh)
- **Redis (Upstash)** wraps:
  - exchange rates (24h)
  - product list keys (5min, future)
  - rate-limit windows

Falls back to in-memory `Map` if Upstash isn't configured — fine for single-instance dev.

## Multi-currency

- `useUIStore` persists selected currency in localStorage
- `lib/currency.formatPrice` is the only formatter used in components
- `lib/currency.convertPrice` converts USD-anchored amounts (rates from `exchange_rates` table)
- Daily cron at `/api/cron/exchange-rates` refreshes via `EXCHANGE_RATES_API_KEY`

## Multi-language

- next-intl with `localePrefix: "as-needed"` — `/en` is implicit, `/hi` and `/ne` are explicit
- Messages in `src/messages/{en,hi,ne}.json`
- Keys you add elsewhere fall back to the EN catalog automatically

## SEO

| Element | Where | Notes |
|---|---|---|
| Dynamic sitemap | `app/sitemap.ts` | All products + categories + blog posts |
| Robots | `app/robots.ts` | Blocks `/api/`, `/admin/`, `/auth/`, `/account/`, `/checkout/`, `/cart/` |
| Open Graph image | `app/opengraph-image.tsx` | Generated at edge |
| Product JSON-LD | `app/(storefront)/products/[slug]/page.tsx` | Includes brand, offers, aggregateRating |
| Organization + WebSite JSON-LD | `app/layout.tsx` | Site-wide |
| Breadcrumb JSON-LD | Per page | From `lib/schema-org.breadcrumbSchema` |
| FAQ JSON-LD | Product page when FAQs exist | |

## Performance budget

- Lighthouse target ≥ 95
- All product list/detail pages are RSC (no client JS for the catalog)
- Only `next/image` is used for product images
- `optimizePackageImports` set for `lucide-react`, `recharts`, `date-fns`
- Strict security headers in `next.config.ts`

## Extensibility

| Add a... | Touch this |
|---|---|
| New supplier | `src/lib/dropshipping/<name>.ts` + register in `index.ts` |
| New payment provider | `src/lib/<name>.ts` + create/webhook routes |
| New AI feature | `src/lib/ai/<feature>.ts` (use `complete()` helper) |
| New admin page | `src/app/admin/<route>/page.tsx` + entry in `components/admin/sidebar.tsx` |
| New customer page | `src/app/(storefront)/<route>/page.tsx` |
| New locale | Add to `LOCALES` in `lib/constants.ts`, create `messages/<locale>.json` |
| New currency | Add to `CURRENCIES` + `CURRENCY_META`, seed an `exchange_rates` row |
