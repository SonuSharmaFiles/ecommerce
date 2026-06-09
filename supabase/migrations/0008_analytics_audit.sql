-- ============================================================
-- 0008_analytics_audit.sql
-- Page views, events, settings, exchange rates, abandoned-cart jobs.
-- ============================================================

-- ---- analytics events (lightweight; aggregate offline) ----
create table if not exists public.analytics_events (
  id            bigserial primary key,
  session_id    text,
  visitor_id    text,
  user_id       uuid references public.profiles(id) on delete set null,
  event_name    text not null,                 -- 'page_view','add_to_cart','begin_checkout','purchase'
  url           text,
  referrer      text,
  user_agent    text,
  ip_address    inet,
  country       text,
  device        text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_term      text,
  utm_content   text,
  properties    jsonb not null default '{}'::jsonb,
  revenue       numeric(12,2),
  created_at    timestamptz not null default now()
);
create index if not exists analytics_event_name_idx on public.analytics_events(event_name, created_at desc);
create index if not exists analytics_user_idx       on public.analytics_events(user_id);
create index if not exists analytics_utm_idx        on public.analytics_events(utm_source, utm_campaign);

-- ---- daily revenue summary (materialized for dashboard) ----
create table if not exists public.revenue_daily (
  day              date primary key,
  orders_count     int not null default 0,
  revenue_total    numeric(14,2) not null default 0,
  refund_total     numeric(14,2) not null default 0,
  avg_order_value  numeric(12,2) not null default 0,
  new_customers    int not null default 0,
  updated_at       timestamptz not null default now()
);

-- ---- settings (kv store for storefront config) ----
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  is_public   boolean not null default false,    -- exposed to client?
  updated_at  timestamptz not null default now()
);

insert into public.settings(key, value, description, is_public) values
  ('store.name', '"ShopFlow"', 'Store display name', true),
  ('store.tagline', '"Premium products, fast delivery"', 'Store tagline', true),
  ('store.contact_email', '"support@shopflow.io"', 'Support email', true),
  ('store.contact_phone', '"+1 555 0100"', 'Support phone', true),
  ('store.address', '"123 Commerce St, San Francisco, CA"', 'Physical address', true),
  ('store.social', '{"twitter":"shopflow","instagram":"shopflow","facebook":"shopflow"}', 'Social links', true),
  ('shipping.default_rate', '7.5', 'Default flat shipping rate', false),
  ('shipping.free_threshold', '75', 'Free shipping over this amount', true),
  ('tax.default_rate', '0', 'Default tax rate %', false),
  ('checkout.allow_guest', 'true', 'Allow guest checkout', false),
  ('loyalty.points_per_dollar', '1', 'Points awarded per $1 spent', true),
  ('ai.enabled', 'true', 'Master AI features toggle', false)
on conflict (key) do nothing;

-- ---- exchange rates (cached daily) ----
create table if not exists public.exchange_rates (
  base_currency  text not null,
  quote_currency text not null,
  rate           numeric(20,10) not null,
  fetched_at     timestamptz not null default now(),
  primary key (base_currency, quote_currency)
);

-- seed common rates (placeholder until first sync)
insert into public.exchange_rates(base_currency, quote_currency, rate) values
  ('USD','USD',1), ('USD','EUR',0.92), ('USD','GBP',0.79), ('USD','AUD',1.52),
  ('USD','CAD',1.37), ('USD','INR',83.20), ('USD','NPR',133.50)
on conflict do nothing;

-- ---- abandoned-cart recovery jobs ----
create table if not exists public.abandoned_cart_jobs (
  id           uuid primary key default uuid_generate_v4(),
  cart_id      uuid not null references public.carts(id) on delete cascade,
  email        citext not null,
  scheduled_at timestamptz not null,
  attempt      int not null default 1,
  status       text not null default 'scheduled',  -- scheduled, sent, skipped, failed
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists abandoned_cart_status_idx on public.abandoned_cart_jobs(status, scheduled_at);

-- ---- webhook event log (idempotency) ----
create table if not exists public.webhook_events (
  id           text primary key,                 -- provider event id
  provider     text not null,                    -- 'stripe','paypal','cj','autods'
  event_type   text not null,
  processed_at timestamptz,
  raw          jsonb not null,
  created_at   timestamptz not null default now()
);
create index if not exists webhook_provider_idx on public.webhook_events(provider, event_type);
