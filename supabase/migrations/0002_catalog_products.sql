-- ============================================================
-- 0002_catalog_products.sql
-- Categories, products, variants, images, inventory, attributes.
-- ============================================================

-- ---- enums ----
do $$ begin
  create type product_status as enum ('draft','active','archived','out_of_stock');
exception when duplicate_object then null; end $$;

-- ---- brands ----
create table if not exists public.brands (
  id         uuid primary key default uuid_generate_v4(),
  slug       text unique not null,
  name       text not null,
  logo_url   text,
  description text,
  created_at timestamptz not null default now()
);

-- ---- categories (self-referential tree) ----
create table if not exists public.categories (
  id           uuid primary key default uuid_generate_v4(),
  parent_id    uuid references public.categories(id) on delete cascade,
  slug         text unique not null,
  name         text not null,
  description  text,
  image_url    text,
  position     int not null default 0,
  seo_title    text,
  seo_description text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists categories_parent_idx on public.categories(parent_id);
create index if not exists categories_active_idx on public.categories(is_active);

-- ---- products ----
create table if not exists public.products (
  id              uuid primary key default uuid_generate_v4(),
  slug            text unique not null,
  sku             text unique,
  title           text not null,
  description     text,
  short_description text,
  brand_id        uuid references public.brands(id) on delete set null,
  status          product_status not null default 'draft',
  base_price      numeric(12,2) not null default 0,
  compare_at_price numeric(12,2),
  cost_price      numeric(12,2),                   -- for profit calc
  currency        text not null default 'USD',
  tax_code        text,
  weight_grams    int,
  -- supplier link (used by dropshipping sync)
  supplier_id     uuid,
  supplier_product_id text,
  supplier_url    text,
  -- SEO
  seo_title       text,
  seo_description text,
  seo_keywords    text[],
  -- stats (denormalized; updated by triggers/cron)
  rating_avg      numeric(3,2) not null default 0,
  rating_count    int not null default 0,
  sales_count     int not null default 0,
  view_count      int not null default 0,
  -- flags
  is_featured     boolean not null default false,
  is_new_arrival  boolean not null default false,
  is_best_seller  boolean not null default false,
  is_on_sale      boolean not null default false,
  -- search
  search_vector   tsvector,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz
);
create index if not exists products_status_idx     on public.products(status);
create index if not exists products_brand_idx      on public.products(brand_id);
create index if not exists products_supplier_idx   on public.products(supplier_id);
create index if not exists products_title_trgm     on public.products using gin (title gin_trgm_ops);
create index if not exists products_search_idx     on public.products using gin (search_vector);
create index if not exists products_featured_idx   on public.products(is_featured) where is_featured = true;
create index if not exists products_bestseller_idx on public.products(is_best_seller) where is_best_seller = true;
create index if not exists products_new_idx        on public.products(is_new_arrival) where is_new_arrival = true;
create index if not exists products_published_idx  on public.products(published_at desc nulls last);

-- search vector trigger
create or replace function public.products_search_vector_update() returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.short_description,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.description,'')), 'C') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.seo_keywords, '{}'::text[]), ' ')), 'B');
  return new;
end $$;

drop trigger if exists products_search_vector_trg on public.products;
create trigger products_search_vector_trg before insert or update of title, description, short_description, seo_keywords
  on public.products for each row execute function public.products_search_vector_update();

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---- product images ----
create table if not exists public.product_images (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  alt_text    text,
  position    int not null default 0,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images(product_id);

-- ---- variants (size/color/etc.) ----
create table if not exists public.product_variants (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references public.products(id) on delete cascade,
  sku         text unique,
  title       text not null,
  options     jsonb not null default '{}'::jsonb,  -- {"color":"Red","size":"M"}
  price       numeric(12,2) not null,
  compare_at_price numeric(12,2),
  cost_price  numeric(12,2),
  weight_grams int,
  image_url   text,
  inventory_quantity int not null default 0,
  inventory_policy text not null default 'deny' check (inventory_policy in ('deny','continue')),
  is_active   boolean not null default true,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists variants_product_idx on public.product_variants(product_id);

-- ---- product <-> category m2m ----
create table if not exists public.product_categories (
  product_id  uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create index if not exists product_categories_cat_idx on public.product_categories(category_id);

-- ---- product specifications / attributes ----
create table if not exists public.product_specifications (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references public.products(id) on delete cascade,
  name        text not null,
  value       text not null,
  position    int not null default 0
);
create index if not exists product_specs_product_idx on public.product_specifications(product_id);

-- ---- product FAQs ----
create table if not exists public.product_faqs (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references public.products(id) on delete cascade,
  question    text not null,
  answer      text not null,
  position    int not null default 0,
  is_ai_generated boolean not null default false
);
create index if not exists product_faqs_product_idx on public.product_faqs(product_id);

-- ---- inventory log (audit + restock) ----
create table if not exists public.inventory_movements (
  id          bigserial primary key,
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  delta       int not null,
  reason      text not null,            -- 'order','restock','adjustment','return','sync'
  reference_id text,
  notes       text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists inv_mov_variant_idx on public.inventory_movements(variant_id, created_at desc);

-- ---- related-product associations (used for upsell/cross-sell/frequently-bought) ----
create table if not exists public.product_relations (
  id          bigserial primary key,
  product_id  uuid not null references public.products(id) on delete cascade,
  related_id  uuid not null references public.products(id) on delete cascade,
  relation_type text not null check (relation_type in ('related','upsell','cross_sell','bundle','frequently_bought')),
  position    int not null default 0,
  unique (product_id, related_id, relation_type)
);
create index if not exists product_relations_idx on public.product_relations(product_id, relation_type);

-- ---- recently viewed (per user) ----
create table if not exists public.recently_viewed (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index if not exists recently_viewed_user_idx on public.recently_viewed(user_id, viewed_at desc);
