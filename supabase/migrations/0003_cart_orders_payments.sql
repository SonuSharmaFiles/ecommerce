-- ============================================================
-- 0003_cart_orders_payments.sql
-- Carts (persistent), orders, line items, payments, shipments.
-- ============================================================

do $$ begin
  create type order_status as enum
    ('pending','processing','fulfilled','shipped','out_for_delivery','delivered','cancelled','refunded','partially_refunded','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum
    ('pending','authorized','paid','partially_refunded','refunded','failed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_provider as enum ('stripe','paypal','manual');
exception when duplicate_object then null; end $$;

-- ---- carts (one per user or anonymous via cart_token cookie) ----
create table if not exists public.carts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.profiles(id) on delete cascade,
  token        text unique,                    -- anonymous cart key
  currency     text not null default 'USD',
  notes        text,
  abandoned_email_sent_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists carts_user_idx on public.carts(user_id);
create index if not exists carts_updated_idx on public.carts(updated_at desc);

drop trigger if exists carts_touch on public.carts;
create trigger carts_touch before update on public.carts
  for each row execute function public.touch_updated_at();

create table if not exists public.cart_items (
  id          uuid primary key default uuid_generate_v4(),
  cart_id     uuid not null references public.carts(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  variant_id  uuid references public.product_variants(id) on delete set null,
  quantity    int not null check (quantity > 0),
  unit_price  numeric(12,2) not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (cart_id, product_id, variant_id)
);
create index if not exists cart_items_cart_idx on public.cart_items(cart_id);

-- ---- orders ----
create table if not exists public.orders (
  id              uuid primary key default uuid_generate_v4(),
  order_number    text unique not null,                    -- e.g. SF-2026-000123
  user_id         uuid references public.profiles(id) on delete set null,
  email           citext not null,
  status          order_status not null default 'pending',
  payment_status  payment_status not null default 'pending',
  currency        text not null default 'USD',
  subtotal        numeric(12,2) not null default 0,
  discount_total  numeric(12,2) not null default 0,
  shipping_total  numeric(12,2) not null default 0,
  tax_total       numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  -- denormalized addresses
  shipping_address jsonb,
  billing_address  jsonb,
  -- references
  coupon_code     text,
  shipping_method text,
  tracking_number text,
  tracking_url    text,
  carrier         text,
  notes_customer  text,
  notes_internal  text,
  -- supplier fulfillment
  supplier_order_id text,
  fulfilled_by    text,
  fulfilled_at    timestamptz,
  shipped_at      timestamptz,
  delivered_at    timestamptz,
  cancelled_at    timestamptz,
  refunded_at     timestamptz,
  -- analytics
  source          text,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists orders_user_idx       on public.orders(user_id);
create index if not exists orders_status_idx     on public.orders(status);
create index if not exists orders_payment_idx    on public.orders(payment_status);
create index if not exists orders_created_idx    on public.orders(created_at desc);
create index if not exists orders_number_idx     on public.orders(order_number);

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---- order items (snapshot at purchase time) ----
create table if not exists public.order_items (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  variant_id    uuid references public.product_variants(id) on delete set null,
  product_title text not null,
  variant_title text,
  sku           text,
  image_url     text,
  quantity      int not null check (quantity > 0),
  unit_price    numeric(12,2) not null,
  total_price   numeric(12,2) not null,
  cost_price    numeric(12,2),                          -- profit calc snapshot
  metadata      jsonb not null default '{}'::jsonb
);
create index if not exists order_items_order_idx   on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id);

-- ---- payments ----
create table if not exists public.payments (
  id             uuid primary key default uuid_generate_v4(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  provider       payment_provider not null,
  status         payment_status not null default 'pending',
  amount         numeric(12,2) not null,
  currency       text not null,
  -- provider refs
  intent_id      text,                       -- stripe payment_intent id
  charge_id      text,                       -- stripe charge / paypal capture id
  paypal_order_id text,
  raw_response   jsonb,
  failure_message text,
  refunded_amount numeric(12,2) not null default 0,
  processed_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists payments_order_idx   on public.payments(order_id);
create index if not exists payments_provider_idx on public.payments(provider, intent_id);

-- ---- refunds ----
create table if not exists public.refunds (
  id             uuid primary key default uuid_generate_v4(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  payment_id     uuid not null references public.payments(id) on delete cascade,
  amount         numeric(12,2) not null,
  reason         text,
  notes          text,
  provider_ref   text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- ---- shipments (multi-shipment support) ----
create table if not exists public.shipments (
  id             uuid primary key default uuid_generate_v4(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  carrier        text,
  tracking_number text,
  tracking_url   text,
  status         text not null default 'pending',
  shipped_at     timestamptz,
  delivered_at   timestamptz,
  raw_provider_data jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists shipments_order_idx on public.shipments(order_id);

-- ---- order status history (for "track order" timeline) ----
create table if not exists public.order_events (
  id         bigserial primary key,
  order_id   uuid not null references public.orders(id) on delete cascade,
  status     order_status not null,
  message    text,
  source     text,            -- 'system','webhook','admin','supplier'
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events(order_id, created_at desc);

-- order number generator
create sequence if not exists public.order_number_seq start 100000;
create or replace function public.generate_order_number() returns text language sql as $$
  select 'SF-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
$$;
