# Deployment guide

## Stack

- **App**: Vercel (Next.js 15)
- **DB + Auth + Storage**: Supabase
- **CDN**: Cloudflare in front of Vercel (optional but recommended for image transforms and edge caching)
- **Cron**: Vercel Cron (or `https://cron-job.org` hitting `/api/cron/*` with `CRON_SECRET`)

## Vercel

1. Push the repo to GitHub
2. Import into Vercel
3. Add env vars (everything in `.env.example`) — most importantly:
   - `NEXT_PUBLIC_APP_URL` = your production URL
   - All Supabase, Stripe, PayPal, Resend keys (live, not test, for production)
   - `CRON_SECRET` (random string)
4. Deploy

Vercel cron config (in `vercel.json`):

```json
{
  "crons": [
    { "path": "/api/cron/exchange-rates",   "schedule": "0 6 * * *" },
    { "path": "/api/cron/abandoned-carts",  "schedule": "0 */2 * * *" },
    { "path": "/api/cron/dropshipping-sync","schedule": "0 */6 * * *" }
  ]
}
```

Vercel cron jobs include an `authorization` header automatically — set it to `Bearer ${CRON_SECRET}` via the dashboard.

## Supabase

1. Create production project
2. Push migrations: `supabase db push --project-ref <ref>`
3. In **Auth → URL Configuration**:
   - Site URL: your production URL
   - Redirect URLs: `https://yourdomain.com/auth/callback`
4. In **Auth → Email Templates**: customize confirm/reset templates
5. (Optional) Enable Google/Apple OAuth providers

## Stripe

1. Get live API keys from <https://dashboard.stripe.com/apikeys>
2. In **Developers → Webhooks**: add endpoint `https://yourdomain.com/api/webhooks/stripe`, listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
3. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## PayPal

1. Create live REST app at <https://developer.paypal.com>
2. Set `PAYPAL_ENV=live` in env
3. Add webhook to `https://yourdomain.com/api/webhooks/paypal`, subscribe to:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.REFUNDED`

## Cloudflare (optional)

1. Add your domain to Cloudflare, set DNS to CNAME → Vercel
2. Caching rule: cache `/sitemap.xml`, `/robots.txt`, `/_next/static/*` aggressively
3. Image resize: route `*.shopflow.io/cdn-cgi/image/*` for CDN-side resizing
4. Page Rules: enable Brotli, minify JS/CSS, HTTP/3

## Post-launch checklist

- [ ] `https://yourdomain.com/sitemap.xml` lists all products
- [ ] Product JSON-LD validates in [Rich Results Test](https://search.google.com/test/rich-results)
- [ ] PageSpeed Insights ≥ 90 mobile, ≥ 95 desktop
- [ ] Test payment with Stripe live mode using a real (small) charge
- [ ] Webhook events flow into the `webhook_events` table
- [ ] First admin user has `super_admin` role
- [ ] Currency switcher persists across navigation
- [ ] Language switcher (EN/HI/NE) works on homepage
