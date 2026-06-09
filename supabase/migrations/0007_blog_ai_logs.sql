-- ============================================================
-- 0007_blog_ai_logs.sql
-- Blog (posts, categories, tags), AI request log, chat sessions.
-- ============================================================

-- ---- blog categories ----
create table if not exists public.blog_categories (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  description text,
  seo_title   text,
  seo_description text,
  created_at  timestamptz not null default now()
);

-- ---- blog tags ----
create table if not exists public.blog_tags (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null
);

-- ---- blog posts ----
create table if not exists public.blog_posts (
  id              uuid primary key default uuid_generate_v4(),
  slug            text unique not null,
  title           text not null,
  excerpt         text,
  body_markdown   text not null,
  body_html       text,
  cover_image_url text,
  author_id       uuid references public.profiles(id) on delete set null,
  category_id     uuid references public.blog_categories(id) on delete set null,
  reading_minutes int,
  -- SEO
  seo_title       text,
  seo_description text,
  seo_keywords    text[],
  canonical_url   text,
  -- state
  is_published    boolean not null default false,
  is_featured     boolean not null default false,
  view_count      int not null default 0,
  -- search
  search_vector   tsvector,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists blog_posts_published_idx on public.blog_posts(is_published, published_at desc);
create index if not exists blog_posts_search_idx    on public.blog_posts using gin (search_vector);
create index if not exists blog_posts_category_idx  on public.blog_posts(category_id);

create or replace function public.blog_search_vector_update() returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.excerpt,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.body_markdown,'')), 'C');
  return new;
end $$;

drop trigger if exists blog_search_trg on public.blog_posts;
create trigger blog_search_trg before insert or update of title, excerpt, body_markdown
  on public.blog_posts for each row execute function public.blog_search_vector_update();

drop trigger if exists blog_posts_touch on public.blog_posts;
create trigger blog_posts_touch before update on public.blog_posts
  for each row execute function public.touch_updated_at();

create table if not exists public.blog_post_tags (
  post_id     uuid not null references public.blog_posts(id) on delete cascade,
  tag_id      uuid not null references public.blog_tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

-- ---- AI request logs (for cost tracking + analytics) ----
create table if not exists public.ai_logs (
  id             bigserial primary key,
  user_id        uuid references public.profiles(id) on delete set null,
  feature        text not null,             -- 'product_description','seo','chat','faq','translation'
  model          text not null,
  prompt_tokens  int not null default 0,
  completion_tokens int not null default 0,
  cached_tokens  int not null default 0,
  cost_usd       numeric(10,6),
  latency_ms     int,
  status         text not null default 'success',
  error          text,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists ai_logs_feature_idx on public.ai_logs(feature, created_at desc);
create index if not exists ai_logs_user_idx    on public.ai_logs(user_id, created_at desc);

-- ---- AI chat sessions (customer support bot) ----
create table if not exists public.chat_sessions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.profiles(id) on delete set null,
  visitor_id   text,
  channel      text not null default 'web',
  metadata     jsonb not null default '{}'::jsonb,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists chat_sessions_user_idx on public.chat_sessions(user_id);

create table if not exists public.chat_messages (
  id           bigserial primary key,
  session_id   uuid not null references public.chat_sessions(id) on delete cascade,
  role         text not null check (role in ('user','assistant','system','tool')),
  content      text not null,
  tool_name    text,
  tool_payload jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists chat_messages_session_idx on public.chat_messages(session_id, created_at);
