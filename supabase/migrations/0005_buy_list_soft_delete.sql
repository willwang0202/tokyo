-- Lets an item be taken off the list without the row ever leaving the table.
--
-- Every migration so far has ended with "still no delete policy and no delete
-- grant. Do not add one." That line still stands and this migration does not
-- break it: there is no DELETE grant here and no delete policy here. Removal is
-- an UPDATE on one boolean, exactly like ticking an item off, and the list read
-- filters on it. Something taken down by mistake comes back with
--
--   update public.buy_list_items set is_deleted = false where id = '…';
--
-- in the SQL editor, which is the whole reason for doing it this way.
--
-- The trade, stated plainly: any holder of the write token can take down any
-- row, including one somebody else added, and nothing records who did. That is
-- the same trust model migration 0004 accepted when it made `name` and `note`
-- rewritable — five people who all know the passphrase — and the row surviving
-- is what makes it tolerable where a real DELETE would not be.
--
-- Removed rows stay readable over the API on purpose. The SELECT policy is
-- still `using (true)`; only the client's query filters them out. Hiding them
-- in RLS would buy nothing — anyone who can read the list can already read
-- every row on it — and it would break the PATCH that sets the flag, because
-- PostgREST asks for the updated row back and the SELECT policy applies to
-- what a RETURNING clause hands over.

alter table public.buy_list_items
  add column if not exists is_deleted boolean not null default false;

comment on column public.buy_list_items.is_deleted is
  'Taken off the list. Rows are never DELETEd; the list read filters on this.';

-- -------------------------------------------------------------- privileges --

-- Additive, as in 0003 and 0004: is_bought, link, the two image columns, name
-- and note all keep the grants they already had. area_key and added_by are
-- still absent and still must be — they answer who wanted this, and where.
grant update (is_deleted) on public.buy_list_items to anon, authenticated;

-- ------------------------------------------------------------------ index --

-- Every list read is now
--   where is_deleted = false order by is_bought, created_at
-- so the index from 0001 no longer matches its leading condition. This one
-- does, and removed rows fall out of it rather than sitting in it forever.
drop index if exists public.buy_list_items_order_idx;

create index if not exists buy_list_items_live_order_idx
  on public.buy_list_items (is_bought, created_at)
  where not is_deleted;

comment on table public.buy_list_items is
  'Shopping list. Rows are never DELETEd — removal raises is_deleted; area_key and added_by are never rewritable.';

-- Still no delete policy and no delete grant. Do not add one.
