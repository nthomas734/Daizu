-- Web push + syrup batches (applied to Kura 2026-10-12). Idempotent.
-- Vault secrets daizu_vapid_private / daizu_alert_key were created
-- separately with vault.create_secret and are not checked in.
create table if not exists public.daizu_push (
  id bigint generated always as identity primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  role text not null check (role in ('barista','customer')),
  created_at timestamptz not null default now()
);
alter table public.daizu_push enable row level security;

alter table public.daizu_orders add column if not exists push_endpoint text;

create table if not exists public.daizu_syrup_batches (
  syrup_id text primary key,
  made_on date not null,
  updated_at timestamptz not null default now()
);
alter table public.daizu_syrup_batches enable row level security;

create or replace function public.daizu_vapid_private()
returns text language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'daizu_vapid_private'
$$;
revoke all on function public.daizu_vapid_private() from public, anon, authenticated;
grant execute on function public.daizu_vapid_private() to service_role;

-- Daily syrup reminder, 9am Pacific (8am in winter)
select cron.schedule('daizu-syrups', '0 16 * * *', $cron$
  select net.http_post(
    url := 'https://daizu-henna.vercel.app/api/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-daizu-key', (select decrypted_secret from vault.decrypted_secrets where name = 'daizu_alert_key')),
    body := '{"kind":"syrups"}'::jsonb,
    timeout_milliseconds := 20000);
$cron$);
