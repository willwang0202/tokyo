-- A photo and a link on a buy-list item.
--
-- 0001 made the list append-only: only is_bought could ever change, so a name
-- or a note is permanent. These two extras are deliberately not like that. You
-- can attach a photo or a link to something already on the list, which means
-- both columns get a column-level UPDATE grant and are therefore rewritable by
-- anyone holding the write token. That is the one guarantee this migration
-- trades away, and it is a one-way door: tightening it needs another migration.
--
-- Images live inline as data URLs rather than in Storage. Storage is a separate
-- service with a separate auth model — it authenticates on JWT claims and never
-- sees the x-buy-list-token header that PostgREST exposes through
-- `request.headers` — so gating uploads there would need an Edge Function
-- holding the secret plus a second place to re-establish append-only. For five
-- people on a five-day trip, keeping one auth surface is worth more than CDN
-- delivery.
--
-- The CHECK constraints below are load-bearing security, not tidiness. The anon
-- key ships in a public bundle, so anyone can POST here directly and the client
-- is not a control. `^https?://` is what keeps a javascript: or data:text/html
-- URL out of an <a href>, and the data:image/ prefix keeps markup out of an
-- <img src>.

alter table public.buy_list_items
  add column if not exists link        text,
  add column if not exists image_thumb text,
  add column if not exists image_full  text;

comment on column public.buy_list_items.link is
  'Product URL. http(s) only — anything else would be an XSS sink in an <a href>.';
comment on column public.buy_list_items.image_thumb is
  'Roughly 128px data URL, sent with every list read. Kept small on purpose.';
comment on column public.buy_list_items.image_full is
  'Roughly 1280px data URL. Never in the list SELECT; fetched by id on demand.';

-- ------------------------------------------------------------- constraints --

-- Postgres has no `add constraint if not exists`, so each is dropped first to
-- keep this migration re-runnable.

alter table public.buy_list_items drop constraint if exists buy_list_items_link_check;
alter table public.buy_list_items add constraint buy_list_items_link_check check (
  link is null
  or (char_length(link) between 8 and 500 and link ~* '^https?://[^[:space:]]+$')
);

alter table public.buy_list_items drop constraint if exists buy_list_items_image_thumb_check;
alter table public.buy_list_items add constraint buy_list_items_image_thumb_check check (
  image_thumb is null
  or (
    char_length(image_thumb) <= 20000
    and image_thumb ~ '^data:image/(webp|jpeg);base64,[A-Za-z0-9+/]+=*$'
  )
);

alter table public.buy_list_items drop constraint if exists buy_list_items_image_full_check;
alter table public.buy_list_items add constraint buy_list_items_image_full_check check (
  image_full is null
  or (
    char_length(image_full) <= 400000
    and image_full ~ '^data:image/(webp|jpeg);base64,[A-Za-z0-9+/]+=*$'
  )
);

-- A thumbnail with no full image would render a row whose photo opens nothing;
-- a full image with no thumbnail would be invisible in the list.
alter table public.buy_list_items drop constraint if exists buy_list_items_image_pair_check;
alter table public.buy_list_items add constraint buy_list_items_image_pair_check check (
  (image_thumb is null) = (image_full is null)
);

-- -------------------------------------------------------------- privileges --

-- Additive: is_bought keeps its grant from 0001. Name, note, area and added_by
-- are still absent here, so they remain unwritable after insert.
grant update (is_bought, link, image_thumb, image_full)
  on public.buy_list_items to anon, authenticated;

-- Still no delete policy and no delete grant. Do not add one.
