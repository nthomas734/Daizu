-- daizu game-night migration
-- Run this in the Supabase SQL Editor BEFORE deploying the new code.
-- Safe to run more than once (all statements use IF NOT EXISTS / DO blocks).

-- Orders table: add mixer and subcategory
alter table daizu_orders
  add column if not exists mixer      text,
  add column if not exists subcategory text;

-- Add a check constraint on subcategory (only if it doesn't already exist)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'daizu_orders_subcategory_check'
  ) then
    alter table daizu_orders
      add constraint daizu_orders_subcategory_check
      check (subcategory is null or subcategory in ('cocktail', 'bottle'));
  end if;
end $$;

-- Favorites table: add mixer and subcategory
alter table daizu_favorites
  add column if not exists mixer       text,
  add column if not exists subcategory text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'daizu_favorites_subcategory_check'
  ) then
    alter table daizu_favorites
      add constraint daizu_favorites_subcategory_check
      check (subcategory is null or subcategory in ('cocktail', 'bottle'));
  end if;
end $$;
