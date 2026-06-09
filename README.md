# ShopFlow

Enterprise-grade dropshipping ecommerce platform — a Shopify alternative.
Built with Next.js 15, TypeScript, Supabase, Stripe, PayPal, Resend, and Claude AI.

## Highlights

- **Customer storefront** — homepage, search, catalog, product detail with variants & reviews, persistent cart, one-page checkout, account area, wishlist, blog
- **Admin dashboard** — KPIs with charts, product CRUD, order management, customer CRM, coupons, suppliers, marketing, analytics, AI tools, blog
- **Payments** — Stripe (Cards/Link/Apple/Google Pay) and PayPal, both with signature-verified webhooks
- **Dropshipping** — Typed CJ Dropshipping and AutoDS adapters with import, sync, and tracking
- **AI** — Claude-powered product description, SEO, FAQ, and customer chat
- **SEO** — dynamic sitemap, robots, JSON-LD (Product, Organization, Breadcrumb, FAQ), Open Graph, canonical URLs
- **i18n** — English, Hindi, Nepali via next-intl
- **Multi-currency** — USD/EUR/GBP/AUD/CAD/INR/NPR with live FX from Redis cache
- **Security** — RBAC with 6 roles, rate limiting, audit log, RLS on all customer data, strict security headers

## Quick start

```bash
cp .env.example .env.local      # then fill in keys
npm install
npm run db:migrate              # applies SQL migrations
npm run db:seed                 # 12 sample products + admin
npm run dev
```

Open <http://localhost:3000>.

## Docs

- [docs/SETUP.md](docs/SETUP.md) — full setup walkthrough
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Vercel + Supabase + Cloudflare
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how it's wired together
- [docs/API.md](docs/API.md) — REST endpoints
