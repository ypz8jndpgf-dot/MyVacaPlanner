# MyVacaPlanner

**Your whole trip, in one link.** A mobile-first trip HQ for small friend groups (~5 people):
invites & RSVP, a shared day-by-day schedule, manual flight entry with an arrivals board,
and expense splitting with a minimal settle-up view. No accounts, no passwords, no app
install — the share link is the key, guests just enter a display name.

First test trip: **Moyapalooza, Jan 16–18, 2027** (seeded automatically, see below).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
# or production:
npm run build && npm run start
```

No environment variables are required for local use — with zero config the app stores
data in a local JSON file (`data/db.json`, created on first run).

## Environment variables (optional)

| Variable | Purpose |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint. Set together with the token to switch storage to Redis. |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token. |

When both are set, all data lives in Redis under the namespaced key `mvp:db`.
When either is missing, the app falls back to the local JSON file store.
See `.env.example`.

## What's built (v1 MVP)

- **Create a trip** (name, dates, location, organizer name) → returns an unguessable
  10-character share slug; the organizer is created as the first attendee, RSVP "in".
- **Join via link** (`/t/<slug>`): enter a display name, RSVP in / can't make it. If your
  name is already on the list, tapping it re-joins as that person (handy after switching
  phones). RSVP can be changed to in / maybe / out any time. Attendee list with headcount.
- **Identity**: your attendee id is remembered per trip in `localStorage` (no accounts).
  "Switch person" lives on the Crew tab.
- **Schedule**: day-by-day itinerary covering every day of the trip (plus any extra days
  items are added to). Items have title, date, time, location, notes. Anyone in the trip
  can add; the creator or the organizer can edit/delete.
- **Flights**: manual entry only — airline, flight #, date, depart/arrive times, airports,
  inbound ("arriving at the trip") or outbound ("heading home"). The **arrivals board**
  sorts inbound flights by landing time for airport-run planning. Attendees add their own
  flights; the organizer can add/edit on anyone's behalf (enforced server-side).
- **Expenses**: description, amount, who paid, split among (defaults to everyone who's
  "in", equal split). All money math is integer cents; uneven splits give the remainder
  cents to the first participants so amounts always sum exactly. Per-person balances
  (owes / is owed), and a **settle-up view** that computes the minimal set of
  who-pays-whom transfers (greedy). **Mark as paid** records the transfer, updates
  balances, and keeps a "Paid so far" history (organizer can undo).
- **Permissions** (light-touch, link-is-the-key model): schedule/expense deletes are
  creator-or-organizer; flight edits are the attendee or organizer; attendee removal and
  trip-detail edits are organizer-only. Enforced in the API routes, not just the UI.
- **Sharing**: the Invite button uses the native share sheet on mobile and falls back to
  copy-link.

## Seeded demo trip

On first run with an empty store, the app seeds the real **Moyapalooza** trip:

- URL: `/t/moyapalooza-2027`
- Jan 16–18, 2027, location left blank (set it in the trip — organizer can edit details via the API; the seed intentionally contains **no** fake schedule items, flights, or expenses)
- Organizer attendee: "Adam", RSVP in

Note: the seeded slug is deliberately readable so the owner can open it immediately.
Rotate it (create a fresh trip and share that link instead) before sending it to the crew
if link secrecy matters.

## Tech

- Next.js 15 (App Router) + TypeScript + Tailwind CSS 3. No other runtime dependencies.
- API routes under `src/app/api/trips/...` perform all mutations; state is one JSON
  document per store, read-modify-written through a serialized `updateDB()` helper.
- Storage adapter in `src/lib/store.ts` with two backends (Upstash Redis REST / local
  JSON file). Money + settle-up logic in `src/lib/logic.ts` (covered by hand-verified
  test cases: uneven splits sum exactly, balances net to zero, settle-up zeroes everyone
  in the minimal greedy transfer set).

## Layout

```
src/
  app/
    page.tsx                  Home: create-a-trip form, your trips, featured Moyapalooza
    t/[slug]/page.tsx         Trip HQ page (server wrapper)
    api/trips/route.ts        List trips / create trip
    api/trips/[slug]/         Get trip, organizer edits, and sub-resources:
      attendees/  schedule/  flights/  expenses/  payments/
  components/TripClient.tsx   The whole trip UI: Crew / Plan / Flights / Money tabs
  lib/
    types.ts                  Data model
    store.ts                  Storage adapter (Redis / JSON file) + seed
    logic.ts                  Money math, balances, settle-up, formatting
public/logo.webp, lockup.webp Brand assets (checklist mark + full lockup)
data/db.json                  Local file store (gitignored, auto-created)
```

## Not built yet (stubbed / out of v1 scope, per product decisions)

- Deployment, custom domain (myvacaplanner.com) wiring, and DNS — future step.
- Live flight status / delays / gates (manual entry only in v1).
- Accounts, cross-trip profiles, invite reminders, plus-ones, waitlists.
- Per-event RSVP, map links, event reminders.
- Uneven/custom expense splits, receipt photos, multi-currency, Venmo/PayPal links.
- PWA manifest / offline support; push notifications.
- Data export/backup of a trip.
- Note: with the Redis backend, the whole DB is one JSON blob — right-sized for a
  5-person trip product at MVP scale, not for thousands of concurrent trips.
