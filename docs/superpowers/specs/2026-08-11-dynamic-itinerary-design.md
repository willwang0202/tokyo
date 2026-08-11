# Dynamic itinerary, stage 1: timeline events in Supabase

**Date:** 2026-08-11
**Status:** approved, ready for planning
**Trip departs:** 2026-08-19 (8 days out)

## Problem

The itinerary lives as a hardcoded `DAYS` array in `src/App.jsx`. Changing a
plan means editing JSX, committing, and waiting for the GitHub Pages deploy —
which is not something four other travellers can do, and not something anyone
wants to do from a phone in Tokyo.

The trip should be editable in the app: add an event, fix a time, drop a plan
that fell through. But some events must not be editable at all. A flight, a
booked airport transfer and a dated park ticket are facts, not plans, and the
cost of one mis-tap deleting the Klook pickup is a family of five stranded at
Haneda.

## Scope

This is deliberately split in two. Only stage 1 is specified here.

**Stage 1 (this spec).** The ~23 timeline events move to Supabase, with the
locked/editable model, a full editor UI, and an offline fallback.

**Stage 2 (separate spec, after stage 1 ships).** The reference content — area
guides, food and shop lists, tips, map POIs, stations, day-trip suggestions,
roughly 135 rows across several shapes — moves to Supabase too.

The split is not arbitrary. The two piles have opposite requirements:

| | Timeline events | Reference content |
|---|---|---|
| Rows | ~23 | ~135 |
| Edited during the trip | Constantly | Almost never |
| Needs a lock model | Yes | No |
| Shape | Uniform | 5 shapes, 3+ tables |
| New behaviour | Editors, locking, offline cache | Mostly just rendering |

Stage 2 is also the riskier one to leave half-finished: if it does not land
before the 19th, nothing breaks, because that content still ships in the bundle.

**Day headers stay in code.** The five day records — date, weekday, title,
`areaKeys` — move to `src/data/days.js` but remain hardcoded. They are fixed by
the flights and the hotel bookings, and making them editable would buy a table
and a foreign key for a thing nobody will change.

## Decisions and why

### Locked events cannot be changed, only annotated

When a booked thing changes mid-trip — a delayed flight, a rescheduled driver —
the locked row stays exactly as it is and the change is recorded as a *new,
unlocked event beside it*. The booked row remains the permanent record of what
was actually booked; reality is layered on top.

Rejected: editing locked rows through the Supabase SQL editor. It works, but
writing SQL on a phone in an airport is a bad plan for the exact moment you
would need it.

Rejected: a long-press-to-unlock gesture in the UI. All five travellers hold the
same write token and the anon key ships in a public bundle, so a client-side
guard is a speed bump, not a lock. Every existing migration in this repo is
explicit that the client is not a control, and this should not be the exception.

### Which events are locked

Eight of the twenty-three, seeded locked: both China Airlines flights, the
Haneda arrival that belongs to the inbound flight, the booked Klook transfer,
both Disney park entries, and both hotel check-ins.

The remaining fifteen — meals, shopping, sightseeing, returning to the hotel,
check-outs, and teamLab Planets, which has no ticket in the vault — are
editable. Locked status is a property of the seed and cannot be changed later
through the app or the API.

### The timeline must render without a network

Today the itinerary is in the bundle, so it renders with no connection at all.
Moving it to Supabase makes the core screen of a travel app depend on roaming
data in a foreign country. Three layers prevent that being a regression:

1. A JSON snapshot bundled at build time paints the first frame.
2. Every successful fetch is written to `localStorage`; on later loads the cache
   wins over the snapshot.
3. Live Supabase data replaces both when it arrives.

Rejected: Supabase-only with a loading spinner. The failure mode — blank
timeline at Haneda arrivals, before anyone has a working SIM — is the single
worst moment for it to happen.

Rejected: keeping the bundle as a baseline and storing only diffs in Supabase.
Smallest payload, but it needs merge and tombstone logic that is hard to reason
about on a phone, and it leaves the base itinerary hardcoded, which is the thing
being fixed.

## Data model

New table `public.itinerary_events`:

| Column | Type | Constraint |
|---|---|---|
| `id` | uuid | primary key, `gen_random_uuid()` |
| `day_id` | smallint | not null, `between 1 and 5` |
| `start_minutes` | smallint | not null, `between 0 and 1439` |
| `is_approximate` | boolean | not null, default false |
| `icon_name` | text | not null, `^[A-Za-z0-9]+$`, length ≤ 32 |
| `title` | text | not null, length 1–60 |
| `description` | text | null, or length 1–300 |
| `event_type` | text | null, or in (`flight`, `transit`) |
| `area_key` | text | null, or in (`bay`, `daiba`, `akiba`, `shibuya`, `shinjuku`) |
| `maps_query` | text | null, or length 1–120 |
| `show_area_badge` | boolean | not null, default true |
| `is_locked` | boolean | not null, default false |
| `is_deleted` | boolean | not null, default false |
| `created_at` | timestamptz | not null, default `now()` |

Reads are ordered `day_id, start_minutes, created_at` and filtered
`is_deleted = false`, with a partial index matching that predicate. The client
fetches **all days in one request**, not per-day: the whole table is around 23
small rows, and having every day in hand means switching day tabs costs no
network at all.

**Time is stored as minutes, not as a label.** `start_minutes` plus
`is_approximate` render as `14:00` or `約 14:00`, which round-trips every label
currently in `App.jsx` while sorting exactly, with no string parsing. A free-text
time column would sort `約 14:00` before `09:00`.

**`icon_name` is a lookup key, never markup.** The client resolves it against a
registry of lucide components and falls back to `MapPin` for anything
unrecognised, so adding an icon later needs no migration. The database therefore
only needs to check it is short and alphanumeric.

**`event_type` drives existing styling.** `flight` and `transit` already render
muted in `EventRow`; null renders bold. This is the current behaviour, preserved.

## Security model

The site is static and public, the Supabase anon key ships in the bundle, and
anyone can POST to this table directly. Every rule therefore lives in the
migration, as it does for `buy_list_items`.

### Write gating

Writes reuse the existing shared token: same vault passphrase, same
`x-buy-list-token` header, same `private.buy_list_secret` row. Nothing new to
seed, and the existing notes about re-seeding when the passphrase changes stay
accurate.

`private.has_buy_list_write_token()` is the wrong name for a check two features
now share. Migration 0006 adds `private.has_shared_write_token()` as the real
implementation and rewrites the buy-list function as a one-line wrapper
delegating to it. Buy-list policies are untouched, and there remains exactly one
definition of the check.

### The lock, enforced three ways

```sql
grant select, insert on public.itinerary_events to anon, authenticated;
grant update (day_id, start_minutes, is_approximate, icon_name, title,
              description, event_type, area_key, maps_query,
              show_area_badge, is_deleted)
  on public.itinerary_events to anon, authenticated;
-- is_locked is deliberately absent from the update grant.

create policy itinerary_events_select on public.itinerary_events
  for select to anon, authenticated using (true);

create policy itinerary_events_insert on public.itinerary_events
  for insert to anon, authenticated
  with check (private.has_shared_write_token() and not is_locked);

create policy itinerary_events_update on public.itinerary_events
  for update to anon, authenticated
  using      (private.has_shared_write_token() and not is_locked)
  with check (private.has_shared_write_token() and not is_locked);
```

Each of the three is load-bearing:

1. **No `is_locked` column grant.** Nobody can promote a row to locked or demote
   CI220 to editable, token or not.
2. **`using (not is_locked)` on UPDATE.** Locked rows are invisible to every
   write, including the `is_deleted` flip. A booked flight can be neither edited
   nor removed.
3. **`not is_locked` on INSERT.** Without it, anyone could POST a locked row and
   create an event nobody can ever delete. Seeding the eight locked rows happens
   in the SQL editor, which bypasses RLS.

### Deletion stays soft

No DELETE grant and no delete policy, consistent with migrations 0001–0005.
Removing an event raises `is_deleted` and the list read filters it out. A row
taken down by mistake comes back with an UPDATE in the SQL editor.

### Content exposure

Everything in this table is world-readable, the same as the buy list. That is
the same exposure the itinerary has today as source in a public repo — the
Klook driver's supplier line already ships in `App.jsx` by an explicit earlier
decision. Nothing that belongs in the encrypted vault goes in this table:
no passport numbers, no ticket numbers, no booking references.

## Client architecture

Mirrors the buy-list stack one-for-one, so the codebase has one pattern rather
than two.

| File | Purpose | Mirrors |
|---|---|---|
| `src/lib/itineraryApi.js` | PostgREST calls: fetch, insert, update, soft delete | `buyListApi.js` |
| `src/lib/itineraryEvent.js` | Draft/edit validation, row↔model mapping, time labels | `buyListItem.js` |
| `src/lib/eventIcons.js` | Icon-name registry, editor palette, fallback | new |
| `src/lib/itineraryCache.js` | Versioned `localStorage` read/write | new |
| `src/hooks/useItinerary.js` | State, visibility refresh, write operations | `useBuyList.js` |
| `src/components/Timeline.jsx` | Day tabs, event list, add affordance | extracted from `App.jsx` |
| `src/components/EventRow.jsx` | One event, lock glyph or pencil | extracted from `App.jsx` |
| `src/components/EventEditor.jsx` | Inline add/edit form | `BuyListEditor.jsx` |
| `src/components/EventDeleteConfirm.jsx` | Confirmation replacing the fields | `BuyListDeleteConfirm.jsx` |
| `src/data/days.js` | The five day headers | moved from `App.jsx` |
| `src/data/itinerarySeed.json` | Generated offline snapshot | new |

`App.jsx` is 878 lines today, past the 800-line limit in the project style
rules. Extracting `Timeline`, `EventRow` and the day headers brings it to
roughly 700. `AreaGuide` and `MapView` stay put — stage 2 relocates them anyway,
and a large mechanical diff eight days before departure is not worth it.

### The snapshot is generated, not hand-written

`npm run itinerary-snapshot` reads the live table and writes
`src/data/itinerarySeed.json`. Running it before the final deploy makes the
offline copy match reality. It is a build-time script; nothing at runtime writes
to it. If it is never run again, the snapshot is simply the itinerary as seeded,
which is a correct if stale fallback.

It needs no secret. Reading the table is open to anyone, so the script uses the
same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` already in `.env.local` —
no write token, no vault passphrase. It writes the same shape the client model
uses, so the snapshot needs no translation at load time.

### Load order

`useItinerary` initialises from the cache if present and valid, otherwise the
bundled snapshot, and marks the data stale. It then fetches; success replaces
the list, writes the cache, and clears the stale flag. Failure keeps whatever is
displayed and leaves the flag raised. As with the buy list, the fetch repeats
whenever the tab returns to the foreground, because five people share this data.

## UI behaviour

Reading needs no passphrase, exactly as now. Writing reuses the vault unlock, so
the edit affordances appear only once unlocked.

- **Locked rows** render as they do today plus a small muted lock glyph beside
  the time. No pencil, ever. Tapping the glyph shows `已預訂・無法修改`.
- **Editable rows** get the same pencil used on buy-list rows. It opens an
  inline `EventEditor` with time, approximate toggle, icon palette, title,
  description, type, area, maps query and badge toggle. Remove lives inside the
  editor behind a confirmation that replaces the fields, so the destructive
  button is never one mis-tap from Save.
- **Add** is a dashed `+ 新增行程` row at the foot of each day, visible only when
  unlocked. New events are always unlocked; the insert policy refuses otherwise.
- **Stale data** shows `離線・顯示上次同步的行程` under the day title.

Writes are not optimistic. Every one is a form submission with a saving state —
there is no one-tap toggle here, so the buy list's optimistic path does not
apply.

## Error handling

Mirrors the buy list: an `ItineraryError` carrying zh-TW copy safe to display,
with real detail sent to `console.error`. 401 and 403 map to a re-unlock prompt;
anything else maps to a generic retry message. A write that RLS rejects comes
back as zero rows rather than an error status, so a zero-row response to a PATCH
is treated as a failure with a re-unlock message, exactly as `buyListApi` does.

## Testing

Targeting the project's 80% floor.

- `itineraryEvent.test.js` — blank and overlong titles, minutes out of range,
  unknown area key, `約` label formatting, row round-trip
- `itineraryApi.test.js` — the read filters `is_deleted=is.false` and orders by
  `day_id,start_minutes,created_at`; `is_locked` never appears in any request
  body; the module issues no DELETE
- `itineraryCache.test.js` — corrupt JSON and version mismatch both discard
  cleanly rather than throwing
- `eventIcons.test.js` — every `icon_name` in the seed resolves; an unknown name
  falls back
- `useItinerary.test.js` — cache seeds initial state; a fetch failure keeps the
  cached list and raises the stale flag
- A test asserting `itinerarySeed.json` parses and every row carries the fields
  the renderer requires

Fixtures use synthetic values throughout. No real passport, ticket or booking
reference appears in any test file.

## Rollout

1. Apply 0006 (schema, grants, policies, shared token function) in the Supabase
   SQL editor.
2. Apply 0007 (seed) in the SQL editor, so the eight locked rows bypass the
   insert policy.
3. Verify against the live table: a token-less PATCH is refused; a token-bearing
   PATCH on a locked row returns zero rows; a token-bearing PATCH on an editable
   row succeeds.
4. Merge the client change. The bundled snapshot ships with it, so a failure to
   reach Supabase degrades to the current behaviour rather than a blank screen.
5. Run `npm run itinerary-snapshot` and commit the refreshed file before the
   final pre-trip deploy.

## Out of scope

- Reference content (area guides, map POIs) — stage 2
- Editing day headers, or adding a sixth day
- Reordering events by drag; ordering is by time
- Per-person attribution of edits; the buy list's `added_by` has no analogue here
- Undo in the UI; recovery is an UPDATE in the SQL editor, as with the buy list

## Known risks

- **Any token holder can edit any unlocked event, and nothing records who did.**
  This is the same trust model migrations 0004 and 0005 already accepted for the
  buy list: five people who share one passphrase. The lock is what protects the
  events where that trust is not enough.
- **The bundled snapshot can be stale**, showing an event that was since removed.
  The stale badge is the mitigation, along with refreshing the snapshot before
  the final deploy.
- **A passphrase change breaks writes** until the secret row is re-seeded with
  `npm run buy-list-token`, exactly as it does for the buy list today.
