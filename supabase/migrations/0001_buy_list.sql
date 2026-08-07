-- Shared buy list for the Tokyo trip.
--
-- The app is a static site on a public repo, so the Supabase anon key ships in
-- the JS bundle and anyone can reach this table. Every rule therefore lives
-- here rather than in the client:
--
--   * anyone may READ the list
--   * only a request carrying the shared write token may ADD a row
--   * an update may touch nothing but is_bought (column-level grant)
--   * DELETE is granted to nobody and has no policy — rows are permanent
--
-- Apply in the Supabase SQL editor, then seed the write token with
--   VAULT_PASSPHRASE='…' npm run buy-list-token
-- and run the INSERT that prints.

-- ---------------------------------------------------------------- the list --

create table if not exists public.buy_list_items (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null check (char_length(name) between 1 and 60),
  note       text        check (note is null or char_length(note) between 1 and 140),
  area_key   text        check (area_key in ('bay', 'daiba', 'akiba', 'shibuya', 'shinjuku')),
  added_by   text        check (added_by is null or char_length(added_by) between 1 and 16),
  is_bought  boolean     not null default false,
  created_at timestamptz not null default now()
);

comment on table public.buy_list_items is
  'Append-only shopping list. Only is_bought may ever change; nothing is deletable.';

create index if not exists buy_list_items_order_idx
  on public.buy_list_items (is_bought, created_at);

-- -------------------------------------------------------- the write secret --

-- One row, readable by no API role. Only the SECURITY DEFINER function below
-- can see it, so the token never leaves the database.
create table if not exists public.buy_list_secret (
  id    boolean primary key default true check (id),
  token text not null check (char_length(token) = 64)
);

alter table public.buy_list_secret enable row level security;
revoke all on public.buy_list_secret from anon, authenticated;

/*
 * True when the caller presented the shared write token.
 *
 * PostgREST exposes request headers lowercased in `request.headers`; the
 * setting is absent outside a request (the SQL editor), hence the coalesce.
 */
create or replace function public.has_buy_list_write_token()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.buy_list_secret s
    where s.token = coalesce(
      nullif(current_setting('request.headers', true), '')::json ->> 'x-buy-list-token',
      ''
    )
  );
$$;

revoke all on function public.has_buy_list_write_token() from public;
grant execute on function public.has_buy_list_write_token() to anon, authenticated;

-- -------------------------------------------------------------- privileges --

-- Column-level UPDATE is what makes the list append-only: even a caller with a
-- valid token cannot rewrite the name, the note or who asked for it.
revoke all on public.buy_list_items from anon, authenticated;
grant select, insert on public.buy_list_items to anon, authenticated;
grant update (is_bought) on public.buy_list_items to anon, authenticated;

alter table public.buy_list_items enable row level security;

drop policy if exists buy_list_items_select on public.buy_list_items;
create policy buy_list_items_select
  on public.buy_list_items
  for select
  to anon, authenticated
  using (true);

drop policy if exists buy_list_items_insert on public.buy_list_items;
create policy buy_list_items_insert
  on public.buy_list_items
  for insert
  to anon, authenticated
  with check (public.has_buy_list_write_token());

drop policy if exists buy_list_items_update on public.buy_list_items;
create policy buy_list_items_update
  on public.buy_list_items
  for update
  to anon, authenticated
  using (public.has_buy_list_write_token())
  with check (public.has_buy_list_write_token());

-- No delete policy and no delete grant, on purpose. Do not add one.
