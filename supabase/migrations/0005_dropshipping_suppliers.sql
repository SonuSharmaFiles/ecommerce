-- ============================================================
-- 0005_dropshipping_suppliers.sql
-- Suppliers, supplier products map, sync logs, fulfillment.
-- ============================================================

do $$ begin
  create type supplier_provider as enum ('cj','autods','aliexpress','spocket','manual','custom');
exception when duplicate_object then null; end $$;

create table if not exists public.suppliers (
  id             uuid primary key default uuid_generate_v4(),
  provider       supplier_provider not null default 'manual',
  name           text not null,
  contact_email  text,
  contact_phone  text,
  website        text,
  api_key        text,            -- encrypted at app layer
  api_secret     text,
  api_endpoint   text,
  -- performance metrics (denormalized; updated by cron)
  total_orders         int not null default 0,
  on_time_rate         numeric(5,2) not null default 0,
  defect_rate          numeric(5,2) not null default 0,
  avg_processing_hours numeric(7,2) not null default 0,
  rating               numeric(3,2) not null default 0,
  notes          text,
  is_active      boolean not null default true,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists suppliers_provider_idx on public.suppliers(provider);
create index if not exists suppliers_active_idx   on public.suppliers(is_active);

drop trigger if exists suppliers_touch on public.suppliers;
create trigger suppliers_touch before update on public.suppliers
  for each row execute function public.touch_updated_at();

-- backfill the FK on products.supplier_id
alter table public.products
  drop constraint if exists products_supplier_id_fkey,
  add  constraint products_supplier_id_fkey
       foreign key (supplier_id) references public.suppliers(id) on delete set null;

-- supplier price/stock sync history
create table if not exists public.supplier_sync_logs (
  id          bigserial primary key,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  sync_type   text not null,                       -- 'price','stock','products','orders','tracking'
  status      text not null,                       -- 'started','success','partial','failed'
  items_processed int not null default 0,
  items_updated int not null default 0,
  items_failed int not null default 0,
  error_message text,
  raw         jsonb,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists supplier_sync_supplier_idx on public.supplier_sync_logs(supplier_id, started_at desc);

-- supplier-fulfilled orders (map ShopFlow order -> supplier order id)
create table if not exists public.supplier_orders (
  id             uuid primary key default uuid_generate_v4(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  supplier_id    uuid not null references public.suppliers(id) on delete cascade,
  supplier_order_id text,
  status         text not null default 'pending',
  cost_total     numeric(12,2),
  currency       text,
  raw            jsonb,
  submitted_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists supplier_orders_order_idx on public.supplier_orders(order_id);

drop trigger if exists supplier_orders_touch on public.supplier_orders;
create trigger supplier_orders_touch before update on public.supplier_orders
  for each row execute function public.touch_updated_at();

-- bulk pricing rules (apply margins automatically to supplier-imported products)
create table if not exists public.pricing_rules (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  scope        text not null check (scope in ('all','supplier','category','brand')),
  scope_id     uuid,
  markup_type  text not null check (markup_type in ('percentage','fixed','formula')),
  markup_value numeric(12,2) not null,
  rounding     text default 'none' check (rounding in ('none','0.99','0.95','nearest_1','nearest_5')),
  applies_to_compare_at boolean not null default false,
  is_active    boolean not null default true,
  priority     int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists pricing_rules_active_idx on public.pricing_rules(is_active, priority);
