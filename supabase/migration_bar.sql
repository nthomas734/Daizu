-- ─────────────────────────────────────────────────────────────────────────────
-- daizu — bar mode migration
--
-- Run this AFTER schema.sql, in the same Supabase SQL editor.
-- This adds the columns needed for cocktail orders without touching existing
-- coffee orders.
--
-- Safe to run multiple times — every statement uses IF NOT EXISTS or the
-- equivalent pattern.
-- ─────────────────────────────────────────────────────────────────────────────

-- Make `temp` nullable on orders (cocktails don't have a temperature)
alter table orders alter column temp drop not null;

-- Drop the old check constraint and replace with one that allows NULL
alter table orders drop constraint if exists orders_temp_check;
alter table orders add constraint orders_temp_check
  check (temp is null or temp in ('hot', 'iced'));

-- Same for favorites
alter table favorites alter column temp drop not null;
alter table favorites drop constraint if exists favorites_temp_check;
alter table favorites add constraint favorites_temp_check
  check (temp is null or temp in ('hot', 'iced'));

-- Add new columns to orders
alter table orders add column if not exists category text not null default 'cafe'
  check (category in ('cafe', 'bar'));
alter table orders add column if not exists strength text
  check (strength is null or strength in ('light', 'standard', 'strong'));
alter table orders add column if not exists quantity integer not null default 1
  check (quantity >= 1 and quantity <= 4);
alter table orders add column if not exists spirit text;

-- Same columns on favorites
alter table favorites add column if not exists category text not null default 'cafe'
  check (category in ('cafe', 'bar'));
alter table favorites add column if not exists strength text
  check (strength is null or strength in ('light', 'standard', 'strong'));
alter table favorites add column if not exists quantity integer not null default 1
  check (quantity >= 1 and quantity <= 4);
alter table favorites add column if not exists spirit text;

-- Index for filtering by category in the future (e.g., bar-only stats)
create index if not exists orders_category_idx on orders(category);
