-- ============================================================
-- 0004_reviews_coupons_wishlist.sql
-- Reviews, coupons, wishlist, saved-cart, customer tags/segments.
-- ============================================================

do $$ begin
  create type coupon_type as enum ('percentage','fixed_amount','free_shipping','buy_x_get_y');
exception when duplicate_object then null; end $$;

-- ---- product reviews ----
create table if not exists public.reviews (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  order_id    uuid references public.orders(id) on delete set null,
  rating      int not null check (rating between 1 and 5),
  title       text,
  body        text,
  author_name text,
  is_verified boolean not null default false,
  is_approved boolean not null default false,
  helpful_count int not null default 0,
  images      text[] not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists reviews_product_idx  on public.reviews(product_id, is_approved);
create index if not exists reviews_user_idx     on public.reviews(user_id);

-- recompute product rating aggregates on review changes
create or replace function public.recompute_product_rating(p uuid) returns void language plpgsql as $$
begin
  update public.products
     set rating_avg   = coalesce((select avg(rating)::numeric(3,2) from public.reviews where product_id = p and is_approved), 0),
         rating_count = (select count(*) from public.reviews where product_id = p and is_approved)
   where id = p;
end $$;

create or replace function public.reviews_after_change() returns trigger language plpgsql as $$
begin
  perform public.recompute_product_rating(coalesce(new.product_id, old.product_id));
  return null;
end $$;

drop trigger if exists reviews_recompute on public.reviews;
create trigger reviews_recompute after insert or update or delete on public.reviews
  for each row execute function public.reviews_after_change();

-- ---- coupons ----
create table if not exists public.coupons (
  id              uuid primary key default uuid_generate_v4(),
  code            text unique not null,
  description     text,
  type            coupon_type not null,
  value           numeric(12,2) not null,                  -- % or amount
  currency        text,
  min_order_amount numeric(12,2),
  max_discount    numeric(12,2),
  usage_limit_total int,
  usage_limit_per_user int default 1,
  used_count      int not null default 0,
  applies_to_products uuid[] not null default '{}',
  applies_to_categories uuid[] not null default '{}',
  excludes_sale_items boolean not null default false,
  free_shipping   boolean not null default false,
  starts_at       timestamptz,
  expires_at      timestamptz,
  is_active       boolean not null default true,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists coupons_active_idx on public.coupons(is_active, expires_at);

create table if not exists public.coupon_redemptions (
  id          bigserial primary key,
  coupon_id   uuid not null references public.coupons(id) on delete cascade,
  order_id    uuid not null references public.orders(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  amount      numeric(12,2) not null,
  created_at  timestamptz not null default now()
);
create index if not exists coupon_red_coupon_idx on public.coupon_redemptions(coupon_id);
create index if not exists coupon_red_user_idx   on public.coupon_redemptions(user_id);

-- ---- wishlist ----
create table if not exists public.wishlists (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null default 'My Wishlist',
  is_public   boolean not null default false,
  share_token text unique,
  created_at  timestamptz not null default now()
);
create index if not exists wishlists_user_idx on public.wishlists(user_id);

create table if not exists public.wishlist_items (
  id          uuid primary key default uuid_generate_v4(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  variant_id  uuid references public.product_variants(id) on delete set null,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (wishlist_id, product_id, variant_id)
);

-- ---- saved carts ----
create table if not exists public.saved_carts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  items       jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists saved_carts_user_idx on public.saved_carts(user_id);

-- ---- customer tags & segments (CRM) ----
create table if not exists public.customer_tags (
  id          uuid primary key default uuid_generate_v4(),
  name        text unique not null,
  color       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.customer_tag_assignments (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  tag_id      uuid not null references public.customer_tags(id) on delete cascade,
  primary key (user_id, tag_id)
);

create table if not exists public.customer_segments (
  id          uuid primary key default uuid_generate_v4(),
  name        text unique not null,
  description text,
  rules       jsonb not null,         -- { spent_gte: 100, orders_gte: 2, country: 'US' }
  created_at  timestamptz not null default now()
);

create table if not exists public.customer_notes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  body        text not null,
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists customer_notes_user_idx on public.customer_notes(user_id, created_at desc);
