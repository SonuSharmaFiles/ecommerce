# Setup guide

## 1. Prereqs

- Node.js 20+
- A [Supabase](https://supabase.com) project (or local: `supabase start`)
- A [Stripe](https://stripe.com) account (test mode is fine)
- A [PayPal](https://developer.paypal.com) sandbox account
- An [Anthropic](https://console.anthropic.com) API key (optional — AI features fall back gracefully)
- A [Resend](https://resend.com) API key (optional — emails are logged but not sent without it)

Optional but recommended:
- [Upstash Redis](https://upstash.com) for caching + rate limiting in serverless
- [Twilio](https://www.twilio.com) for SMS

## 2. Environment

```bash
cp .env.example .env.local
```

Fill in (minimum):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. Database

If using Supabase cloud:

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-ref>
supabase db push
```

If running locally:

```bash
supabase start              # spins up local Postgres + Studio
supabase db reset           # applies all migrations from /supabase/migrations
```

Then seed:

```bash
ADMIN_BOOTSTRAP_EMAIL=you@example.com npm run db:seed
```

This creates 12 sample products and (if the email matches an existing auth user) promotes them to `super_admin`.

## 4. Stripe webhooks (dev)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Stripe CLI prints a webhook signing secret — copy that into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## 5. PayPal webhooks (dev)

PayPal doesn't have a CLI like Stripe, but you can use [smee.io](https://smee.io) or the dashboard's sandbox webhook listener.

## 6. Run

```bash
npm run dev
```

- Storefront: <http://localhost:3000>
- Admin: <http://localhost:3000/admin/dashboard> (must be logged in as an admin role)
- Login/signup: <http://localhost:3000/auth/login>

## 7. Become an admin

1. Sign up at `/auth/signup` with the email you used for `ADMIN_BOOTSTRAP_EMAIL`
2. Re-run `npm run db:seed` (it'll promote your role to `super_admin`)
3. Log in → visit `/admin/dashboard`

Alternatively, in SQL:
```sql
update public.profiles set role = 'super_admin' where email = 'you@example.com';
```

## 8. Optional integrations

| Integration | Env vars | What unlocks |
|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | Real AI product/SEO/chat (otherwise: deterministic fallback) |
| Resend | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Outbound transactional emails (otherwise: logged only) |
| Twilio | `TWILIO_*` | SMS OTPs and order updates |
| Upstash | `UPSTASH_REDIS_REST_*` | Real cache + distributed rate limit (otherwise: in-memory) |
| CJ Dropshipping | `CJ_DROPSHIPPING_*` | Real product import + sync (otherwise: mock products) |
| AutoDS | `AUTODS_*` | Real product import + sync (otherwise: mock products) |
| Exchange rates | `EXCHANGE_RATES_API_KEY` | Live FX rates (otherwise: bundled snapshot) |
| CRON | `CRON_SECRET` | Protects `/api/cron/*` endpoints |
