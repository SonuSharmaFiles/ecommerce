-- ============================================================
-- 0009_rls_policies.sql
-- Row-level security for customer-facing data. Service-role key
-- bypasses RLS, so admin server code is unaffected.
-- ============================================================

-- helper: is staff?
create or replace function public.is_staff(uid uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role in ('support','editor','manager','admin','super_admin')
  );
$$;

create or replace function public.is_admin(uid uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role in ('manager','admin','super_admin')
  );
$$;

-- ---- profiles ----
alter table public.profiles enable row level security;
drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles for select
  using (auth.uid() = id or public.is_staff(auth.uid()));
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ---- addresses ----
alter table public.addresses enable row level security;
drop policy if exists "addresses owner all" on public.addresses;
create policy "addresses owner all" on public.addresses
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- carts ----
alter table public.carts enable row level security;
drop policy if exists "carts owner all" on public.carts;
create policy "carts owner all" on public.carts
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

alter table public.cart_items enable row level security;
drop policy if exists "cart_items owner all" on public.cart_items;
create policy "cart_items owner all" on public.cart_items
  using (exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = auth.uid() or c.user_id is null)))
  with check (exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = auth.uid() or c.user_id is null)));

-- ---- orders ----
alter table public.orders enable row level security;
drop policy if exists "orders owner select" on public.orders;
create policy "orders owner select" on public.orders for select
  using (auth.uid() = user_id or public.is_staff(auth.uid()));

alter table public.order_items enable row level security;
drop policy if exists "order_items owner select" on public.order_items;
create policy "order_items owner select" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff(auth.uid()))));

alter table public.payments enable row level security;
drop policy if exists "payments owner select" on public.payments;
create policy "payments owner select" on public.payments for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff(auth.uid()))));

alter table public.shipments enable row level security;
drop policy if exists "shipments owner select" on public.shipments;
create policy "shipments owner select" on public.shipments for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff(auth.uid()))));

-- ---- reviews ----
alter table public.reviews enable row level security;
drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read" on public.reviews for select using (is_approved or auth.uid() = user_id or public.is_staff(auth.uid()));
drop policy if exists "reviews owner write" on public.reviews;
create policy "reviews owner write" on public.reviews
  for insert with check (auth.uid() = user_id);
drop policy if exists "reviews owner update" on public.reviews;
create policy "reviews owner update" on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- wishlists ----
alter table public.wishlists enable row level security;
drop policy if exists "wishlists owner all" on public.wishlists;
create policy "wishlists owner all" on public.wishlists
  using (auth.uid() = user_id or is_public)
  with check (auth.uid() = user_id);

alter table public.wishlist_items enable row level security;
drop policy if exists "wishlist_items owner all" on public.wishlist_items;
create policy "wishlist_items owner all" on public.wishlist_items
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and (w.user_id = auth.uid() or w.is_public)))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));

alter table public.saved_carts enable row level security;
drop policy if exists "saved_carts owner all" on public.saved_carts;
create policy "saved_carts owner all" on public.saved_carts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- loyalty ----
alter table public.loyalty_accounts enable row level security;
drop policy if exists "loyalty owner select" on public.loyalty_accounts;
create policy "loyalty owner select" on public.loyalty_accounts for select
  using (auth.uid() = user_id or public.is_staff(auth.uid()));

alter table public.loyalty_transactions enable row level security;
drop policy if exists "loyalty_tx owner select" on public.loyalty_transactions;
create policy "loyalty_tx owner select" on public.loyalty_transactions for select
  using (auth.uid() = user_id or public.is_staff(auth.uid()));

-- ---- public-readable catalog tables (no RLS needed; just enable read for anon) ----
alter table public.products enable row level security;
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products for select using (status = 'active' or public.is_staff(auth.uid()));

alter table public.product_images enable row level security;
drop policy if exists "product_images public read" on public.product_images;
create policy "product_images public read" on public.product_images for select using (true);

alter table public.product_variants enable row level security;
drop policy if exists "product_variants public read" on public.product_variants;
create policy "product_variants public read" on public.product_variants for select using (is_active or public.is_staff(auth.uid()));

alter table public.product_categories enable row level security;
drop policy if exists "product_categories public read" on public.product_categories;
create policy "product_categories public read" on public.product_categories for select using (true);

alter table public.product_specifications enable row level security;
drop policy if exists "product_specs public read" on public.product_specifications;
create policy "product_specs public read" on public.product_specifications for select using (true);

alter table public.product_faqs enable row level security;
drop policy if exists "product_faqs public read" on public.product_faqs;
create policy "product_faqs public read" on public.product_faqs for select using (true);

alter table public.product_relations enable row level security;
drop policy if exists "product_relations public read" on public.product_relations;
create policy "product_relations public read" on public.product_relations for select using (true);

alter table public.categories enable row level security;
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories for select using (is_active);

alter table public.brands enable row level security;
drop policy if exists "brands public read" on public.brands;
create policy "brands public read" on public.brands for select using (true);

alter table public.blog_posts enable row level security;
drop policy if exists "blog public read" on public.blog_posts;
create policy "blog public read" on public.blog_posts for select using (is_published or public.is_staff(auth.uid()));

alter table public.blog_categories enable row level security;
drop policy if exists "blog cat public read" on public.blog_categories;
create policy "blog cat public read" on public.blog_categories for select using (true);

alter table public.blog_tags enable row level security;
drop policy if exists "blog tags public read" on public.blog_tags;
create policy "blog tags public read" on public.blog_tags for select using (true);

alter table public.settings enable row level security;
drop policy if exists "settings public read" on public.settings;
create policy "settings public read" on public.settings for select using (is_public or public.is_staff(auth.uid()));

-- newsletter: anyone can subscribe (insert), nobody public can read
alter table public.newsletter_subscribers enable row level security;
drop policy if exists "newsletter insert anon" on public.newsletter_subscribers;
create policy "newsletter insert anon" on public.newsletter_subscribers for insert with check (true);
drop policy if exists "newsletter self read" on public.newsletter_subscribers;
create policy "newsletter self read" on public.newsletter_subscribers for select using (auth.uid() = user_id or public.is_staff(auth.uid()));
