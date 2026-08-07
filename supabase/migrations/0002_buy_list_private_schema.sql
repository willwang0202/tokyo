-- Move the write-token machinery out of the API-exposed schema.
--
-- 0001 put both the secret table and the check function in `public`. Neither
-- leaked anything — the table had no grants and the function only ever returns
-- a boolean — but PostgREST publishes everything in `public`, so
-- `POST /rest/v1/rpc/has_buy_list_write_token` answered true/false for any
-- guess. Against a 256-bit token that oracle is useless, but there is no
-- reason to offer it.
--
-- PostgREST only exposes schemas it is configured with (`public`), so anything
-- in `private` is unreachable over the API even though anon holds USAGE on the
-- schema — which it needs, because RLS policy expressions are evaluated as the
-- calling role.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- Carries its data and its (empty) grants across with it.
alter table public.buy_list_secret set schema private;

create or replace function private.has_buy_list_write_token()
returns boolean
language sql
stable
security definer
set search_path = private
as $$
  select exists (
    select 1
    from private.buy_list_secret s
    where s.token = coalesce(
      nullif(current_setting('request.headers', true), '')::json ->> 'x-buy-list-token',
      ''
    )
  );
$$;

revoke all on function private.has_buy_list_write_token() from public;
grant execute on function private.has_buy_list_write_token() to anon, authenticated;

-- Repoint the policies before dropping the old function; they depend on it.
drop policy if exists buy_list_items_insert on public.buy_list_items;
create policy buy_list_items_insert
  on public.buy_list_items
  for insert
  to anon, authenticated
  with check (private.has_buy_list_write_token());

drop policy if exists buy_list_items_update on public.buy_list_items;
create policy buy_list_items_update
  on public.buy_list_items
  for update
  to anon, authenticated
  using (private.has_buy_list_write_token())
  with check (private.has_buy_list_write_token());

drop function if exists public.has_buy_list_write_token();

-- Still no delete policy and no delete grant. Do not add one.
