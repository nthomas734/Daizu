-- ─────────────────────────────────────────────────────────────────────────────
-- daizu — database schema
--
-- Paste this entire file into Supabase's SQL Editor (in the dashboard) and
-- click "Run". This creates all tables, indexes, and policies needed.
--
-- You only need to do this once, when you first create the Supabase project.
-- ─────────────────────────────────────────────────────────────────────────────

-- Orders: every order placed
create table if not exists orders (
  id          bigserial primary key,
  customer    text        not null default 'Dez',
  drink       text        not null,
  temp        text        not null check (temp in ('hot', 'iced')),
  milk        text,
  syrups      text[]      not null default '{}',
  sweetness   text                 default 'normal',
  extras      text[]      not null default '{}',
  notes       text                 default '',
  status      text        not null default 'received'
              check (status in ('received', 'brewing', 'ready', 'cancelled')),
  ready_phrase_jp text,
  ready_phrase_en text,
  created_at  timestamptz not null default now(),
  ready_at    timestamptz
);

create index if not exists orders_status_idx on orders(status);
create index if not exists orders_created_at_idx on orders(created_at desc);

-- Favorites: saved "usuals" she can re-order with one tap
create table if not exists favorites (
  id          bigserial primary key,
  label       text        not null,
  drink       text        not null,
  temp        text        not null check (temp in ('hot', 'iced')),
  milk        text,
  syrups      text[]      not null default '{}',
  sweetness   text                 default 'normal',
  extras      text[]      not null default '{}',
  notes       text                 default '',
  customer    text                 default 'Dez',
  created_at  timestamptz not null default now()
);

-- Out-of-stock items: barista can hide things from the menu
create table if not exists out_of_stock (
  id        bigserial primary key,
  category  text not null check (category in ('drinks', 'milks', 'syrups')),
  item_id   text not null,
  unique (category, item_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS)
--
-- We don't expose the anon key to risky operations. All writes go through
-- our server API routes (which use the service role key). The anon key is
-- used only for the realtime/polling reads.
-- ─────────────────────────────────────────────────────────────────────────────

alter table orders        enable row level security;
alter table favorites     enable row level security;
alter table out_of_stock  enable row level security;

-- Allow public reads (the frontend polls for status updates).
-- This is fine because the data is non-sensitive (drink names + first names).
create policy "public_read_orders"        on orders        for select using (true);
create policy "public_read_favorites"     on favorites     for select using (true);
create policy "public_read_out_of_stock"  on out_of_stock  for select using (true);

-- Writes are blocked at the RLS level; only the service role (server) can write.
-- (No "for insert / update / delete" policies = no public writes allowed.)
