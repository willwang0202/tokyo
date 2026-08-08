-- Lets an item's wording be corrected after it is on the list.
--
-- Migration 0001 made the list append-only by granting UPDATE on `is_bought`
-- alone; 0003 added the photo and link columns. This widens that grant once
-- more, to `name` and `note`, because a typo in an item was otherwise permanent
-- and the only workaround was adding a second row saying the same thing.
--
-- What is deliberately NOT granted, and should stay that way:
--
--   * `area_key` and `added_by` — the list is also the record of who asked for
--     what and where to look for it. Those two answer that, so they stay fixed.
--   * DELETE — still no grant and still no policy. Do not add one.
--
-- The existing CHECK constraints carry over to updates unchanged: `name` is
-- NOT NULL and 1–60 characters, so a rewrite cannot blank an item out.

grant update (name, note) on public.buy_list_items to anon, authenticated;

comment on table public.buy_list_items is
  'Shopping list. Rows are never deletable; area_key and added_by are never rewritable.';
