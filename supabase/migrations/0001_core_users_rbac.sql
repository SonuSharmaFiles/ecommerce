-- ============================================================
-- 0001_core_users_rbac.sql
-- Profiles, roles, permissions, addresses, audit log.
-- Idempotent: every CREATE uses IF NOT EXISTS or DROP CASCADE.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";        -- fast ILIKE / fuzzy search
create extension if not exists "citext";         -- case-insensitive email

-- ---- enums ----
do $$ begin
  create type user_role as enum ('customer','support','editor','manager','admin','super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('active','suspended','deleted','pending_verification');
exception when duplicate_object then null; end $$;

-- ---- profiles ----
-- 1:1 with auth.users, populated by trigger on auth.users insert
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        citext unique not null,
  full_name    text,
  phone        text,
  avatar_url   text,
  role         user_role not null default 'customer',
  status       user_status not null default 'active',
  locale       text not null default 'en',
  currency     text not null default 'USD',
  marketing_opt_in boolean not null default false,
  metadata     jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists profiles_role_idx       on public.profiles(role);
create index if not exists profiles_status_idx     on public.profiles(status);
create index if not exists profiles_full_name_trgm on public.profiles using gin (full_name gin_trgm_ops);

-- ---- permissions (RBAC) ----
create table if not exists public.permissions (
  key          text primary key,
  description  text
);

create table if not exists public.role_permissions (
  role         user_role not null,
  permission   text not null references public.permissions(key) on delete cascade,
  primary key (role, permission)
);

-- baseline permissions
insert into public.permissions(key, description) values
  ('product.read',      'View products'),
  ('product.write',     'Create/edit products'),
  ('product.delete',    'Delete products'),
  ('order.read',        'View orders'),
  ('order.write',       'Update orders'),
  ('order.refund',      'Issue refunds'),
  ('customer.read',     'View customers'),
  ('customer.write',    'Edit customers'),
  ('coupon.manage',     'Manage coupons'),
  ('supplier.manage',   'Manage suppliers'),
  ('marketing.manage',  'Manage marketing campaigns'),
  ('analytics.read',    'View analytics'),
  ('blog.manage',       'Manage blog posts'),
  ('settings.manage',   'Manage system settings'),
  ('admin.access',      'Access admin panel'),
  ('user.manage',       'Manage staff users')
on conflict (key) do nothing;

-- baseline role -> permission map
insert into public.role_permissions(role, permission)
select 'super_admin'::user_role, key from public.permissions
on conflict do nothing;

insert into public.role_permissions(role, permission) values
  ('admin','admin.access'),('admin','product.read'),('admin','product.write'),('admin','product.delete'),
  ('admin','order.read'),('admin','order.write'),('admin','order.refund'),
  ('admin','customer.read'),('admin','customer.write'),
  ('admin','coupon.manage'),('admin','supplier.manage'),('admin','marketing.manage'),
  ('admin','analytics.read'),('admin','blog.manage'),('admin','settings.manage'),
  ('manager','admin.access'),('manager','product.read'),('manager','product.write'),
  ('manager','order.read'),('manager','order.write'),
  ('manager','customer.read'),('manager','coupon.manage'),('manager','analytics.read'),
  ('support','admin.access'),('support','order.read'),('support','order.write'),
  ('support','customer.read'),('support','customer.write'),
  ('editor','admin.access'),('editor','blog.manage'),('editor','product.read')
on conflict do nothing;

-- ---- addresses ----
create table if not exists public.addresses (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  label        text,
  full_name    text not null,
  phone        text,
  line1        text not null,
  line2        text,
  city         text not null,
  state        text,
  postal_code  text not null,
  country      text not null,
  is_default_shipping boolean not null default false,
  is_default_billing  boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses(user_id);

-- ---- audit log (every admin action) ----
create table if not exists public.audit_logs (
  id           bigserial primary key,
  actor_id     uuid references public.profiles(id) on delete set null,
  action       text not null,
  resource     text not null,
  resource_id  text,
  before_data  jsonb,
  after_data   jsonb,
  ip_address   inet,
  user_agent   text,
  created_at   timestamptz not null default now()
);
create index if not exists audit_actor_idx       on public.audit_logs(actor_id);
create index if not exists audit_resource_idx    on public.audit_logs(resource, resource_id);
create index if not exists audit_created_idx     on public.audit_logs(created_at desc);

-- ---- helper: bump updated_at ----
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---- trigger: auto-create profile when auth.users row is inserted ----
create or replace function public.handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id, email, full_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
