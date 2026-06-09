-- ============================================================
-- 0006_marketing_loyalty_affiliate.sql
-- Email/SMS campaigns, newsletter, referral, loyalty, affiliate.
-- ============================================================

-- ---- newsletter ----
create table if not exists public.newsletter_subscribers (
  id           uuid primary key default uuid_generate_v4(),
  email        citext unique not null,
  user_id      uuid references public.profiles(id) on delete set null,
  source       text,
  is_confirmed boolean not null default false,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  tags         text[] not null default '{}',
  created_at   timestamptz not null default now()
);

-- ---- email campaigns ----
create table if not exists public.email_campaigns (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  subject      text not null,
  preheader    text,
  template     text not null,                 -- template key
  body_html    text,
  body_text    text,
  audience     jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  sent_at      timestamptz,
  status       text not null default 'draft' check (status in ('draft','scheduled','sending','sent','failed','cancelled')),
  -- stats
  sent_count   int not null default 0,
  open_count   int not null default 0,
  click_count  int not null default 0,
  bounce_count int not null default 0,
  unsubscribe_count int not null default 0,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ---- transactional email log ----
create table if not exists public.email_log (
  id           bigserial primary key,
  recipient    citext not null,
  template     text not null,
  subject      text,
  status       text not null,                   -- 'queued','sent','bounced','failed'
  provider_id  text,
  related_type text,
  related_id   text,
  error        text,
  created_at   timestamptz not null default now()
);
create index if not exists email_log_recipient_idx on public.email_log(recipient, created_at desc);

-- ---- SMS log ----
create table if not exists public.sms_log (
  id           bigserial primary key,
  phone        text not null,
  body         text not null,
  status       text not null,
  provider_id  text,
  related_type text,
  related_id   text,
  error        text,
  created_at   timestamptz not null default now()
);

-- ---- referral program ----
create table if not exists public.referrals (
  id            uuid primary key default uuid_generate_v4(),
  referrer_id   uuid not null references public.profiles(id) on delete cascade,
  referee_id    uuid references public.profiles(id) on delete set null,
  referee_email citext,
  code          text unique not null,
  status        text not null default 'pending' check (status in ('pending','signed_up','first_purchase','rewarded','expired')),
  reward_amount numeric(12,2),
  reward_paid   boolean not null default false,
  reward_paid_at timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists referrals_referrer_idx on public.referrals(referrer_id);

-- ---- loyalty (points + tiers) ----
create table if not exists public.loyalty_tiers (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  min_points   int not null,
  perks        jsonb not null default '{}'::jsonb,
  multiplier   numeric(4,2) not null default 1.0,
  is_active    boolean not null default true,
  position     int not null default 0
);

insert into public.loyalty_tiers(name, min_points, multiplier, position) values
  ('Bronze', 0, 1.0, 0), ('Silver', 500, 1.25, 1), ('Gold', 2000, 1.5, 2), ('Platinum', 5000, 2.0, 3)
on conflict do nothing;

create table if not exists public.loyalty_accounts (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  points       int not null default 0,
  lifetime_points int not null default 0,
  tier_id      uuid references public.loyalty_tiers(id) on delete set null,
  updated_at   timestamptz not null default now()
);

create table if not exists public.loyalty_transactions (
  id           bigserial primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  delta        int not null,
  reason       text not null,                  -- 'order','referral','review','adjustment','redemption'
  reference_id text,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists loyalty_tx_user_idx on public.loyalty_transactions(user_id, created_at desc);

-- ---- affiliate system ----
create table if not exists public.affiliates (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid unique references public.profiles(id) on delete cascade,
  code         text unique not null,
  commission_rate numeric(5,2) not null default 10,
  total_earned numeric(12,2) not null default 0,
  total_paid   numeric(12,2) not null default 0,
  paypal_email text,
  status       text not null default 'active',
  created_at   timestamptz not null default now()
);

create table if not exists public.affiliate_clicks (
  id           bigserial primary key,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  ip_address   inet,
  user_agent   text,
  landing_url  text,
  referrer     text,
  created_at   timestamptz not null default now()
);
create index if not exists affiliate_clicks_aff_idx on public.affiliate_clicks(affiliate_id, created_at desc);

create table if not exists public.affiliate_conversions (
  id           bigserial primary key,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  order_id     uuid not null references public.orders(id) on delete cascade,
  order_total  numeric(12,2) not null,
  commission   numeric(12,2) not null,
  status       text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  paid_at      timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.affiliate_payouts (
  id           uuid primary key default uuid_generate_v4(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  amount       numeric(12,2) not null,
  method       text,
  reference    text,
  notes        text,
  paid_at      timestamptz not null default now()
);
