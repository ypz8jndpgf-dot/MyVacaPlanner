"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatDate } from "@/lib/logic";
import {
  ArrowRightIcon,
  CalendarIcon,
  CoinsIcon,
  contactsPickerAvailable,
  pickContactNames,
  PaperPlaneIcon,
  PinIcon,
  coverGradient,
  mapsUrl,
  PlaneIcon,
  UsersIcon,
} from "@/components/ui";

interface TripSummary {
  slug: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  attendeeCount: number;
}

/* Decorative avatar-stack colors for the homepage (no names available
 * from the trip summaries — just the crew count). */
const STACK_COLORS = ["#C4503F", "#2F6F79", "#B9852F", "#3E7A72", "#0B5563", "#A96A44"];

function CrewStack({ count }: { count: number }) {
  if (count === 0) return null;
  const shown = Math.min(count, 5);
  return (
    <span className="flex items-center">
      <span className="flex -space-x-2">
        {Array.from({ length: shown }).map((_, i) => (
          <span
            key={i}
            className="h-7 w-7 rounded-full ring-2 ring-white"
            style={{ backgroundColor: STACK_COLORS[i % STACK_COLORS.length] }}
          />
        ))}
        {count > shown && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[10px] font-extrabold text-white ring-2 ring-white">
            +{count - shown}
          </span>
        )}
      </span>
      <span className="ml-2 text-xs font-bold text-ink-soft">
        {count} {count === 1 ? "traveler" : "travelers"}
      </span>
    </span>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [form, setForm] = useState({ name: "", location: "", startDate: "", endDate: "", organizerName: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  // Contact Picker API exists only on some phones — the pick button
  // renders only where it can actually work.
  const [contactsOk, setContactsOk] = useState(false);
  useEffect(() => {
    setContactsOk(contactsPickerAvailable());
  }, []);

  async function fillOrganizerFromContacts() {
    try {
      const names = await pickContactNames(false);
      if (names[0]) setForm((f) => ({ ...f, organizerName: names[0] }));
    } catch {
      /* picker dismissed — nothing to do */
    }
  }

  useEffect(() => {
    fetch("/api/trips")
      .then((r) => r.json())
      .then((d) => setTrips(d.trips ?? []))
      .catch(() => {});
  }, []);

  async function createTrip(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create the trip");
      return;
    }
    localStorage.setItem(`mvp:me:${data.slug}`, data.organizerId);
    const mine: string[] = JSON.parse(localStorage.getItem("mvp:trips") ?? "[]");
    localStorage.setItem("mvp:trips", JSON.stringify([...new Set([...mine, data.slug])]));
    router.push(`/t/${data.slug}`);
  }

  const featured = trips.find((t) => t.slug === "moyapalooza-2027");
  const others = trips
    .filter((t) => t.slug !== featured?.slug)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <main className="pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "MyVacaPlanner",
            url: "https://myvacaplanner.com",
            applicationCategory: "TravelApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            description:
              "Group trip planner in one shareable link: invites and RSVP, a shared schedule, flight arrivals, crew polls, local events, and expenses split and settled. No accounts or app install.",
          }),
        }}
      />
      {/* ------- Hero: clean cover, one big promise ------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-deep via-teal to-teal-light">
        <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-amber/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-28 bottom-0 h-72 w-72 rounded-full bg-coral/15 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-10 sm:pt-14">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="MyVacaPlanner"
              width={52}
              height={52}
              className="rounded-2xl shadow-lift ring-2 ring-white/25"
            />
            <div>
              <div className="font-display text-xl font-bold leading-none tracking-tight text-white">
                My<span className="text-amber">Vaca</span>Planner
              </div>
              <div className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.28em] text-teal-mist/90">
                myvacaplanner.com
              </div>
            </div>
          </div>

          <h1 className="mt-10 max-w-2xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Every trip.
            <br />
            <span className="text-amber">One link.</span>
          </h1>
          <p className="mt-4 max-w-md text-[17px] font-medium leading-relaxed text-teal-mist">
            Who&apos;s in, who lands when, what&apos;s on, and who owes who — the whole trip in one
            place. No accounts, no app install.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button onClick={() => setShowCreate(true)} className="btn-coral inline-flex items-center gap-2 px-7 py-3.5 text-base">
              <PaperPlaneIcon className="h-5 w-5" /> Plan a trip
            </button>
            <span className="text-sm font-bold text-teal-mist">Free to start · share the link with your crew</span>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2 text-xs font-extrabold text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/25">
              <UsersIcon className="h-4 w-4" /> Crew &amp; RSVPs
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/25">
              <PlaneIcon className="h-4 w-4" /> Arrivals board
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/25">
              <CalendarIcon className="h-4 w-4" /> Shared plan
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/25">
              <CoinsIcon className="h-4 w-4" /> Easy splits
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-5">
        {/* ------- Featured trip: cover card ------- */}
        {featured && (
          <button
            onClick={() => router.push(`/t/${featured.slug}`)}
            className="card group -mt-8 block w-full overflow-hidden p-0 text-left shadow-lift transition duration-200 hover:-translate-y-0.5"
          >
            <div className={`relative bg-gradient-to-br ${coverGradient(featured.slug)} px-6 pb-5 pt-6`}>
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/80">
                  <PlaneIcon className="h-4 w-4 text-amber" /> Featured trip
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-extrabold text-white ring-1 ring-white/25">
                  You&apos;re invited
                </span>
              </div>
              <div className="relative mt-3 font-display text-4xl font-extrabold leading-none tracking-tight text-white">
                {featured.name} 🏌️
              </div>
              {featured.location && (
                <a
                  href={mapsUrl(featured.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="relative mt-2 inline-flex items-center gap-1 text-sm font-bold text-white/90 underline decoration-dotted underline-offset-2"
                >
                  <PinIcon className="h-4 w-4 text-amber" /> {featured.location}
                </a>
              )}
            </div>
            <div className="px-6 pb-5 pt-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-soft">Touchdown</div>
                  <div className="mt-0.5 font-display text-[15px] font-bold leading-snug text-ink">
                    {formatDate(featured.startDate)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-soft">Wheels up</div>
                  <div className="mt-0.5 font-display text-[15px] font-bold leading-snug text-ink">
                    {formatDate(featured.endDate)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-soft">Crew so far</div>
                  <div className="mt-0.5 font-display text-[15px] font-bold leading-snug text-ink">
                    {featured.attendeeCount} {featured.attendeeCount === 1 ? "traveler" : "travelers"}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-cream-edge/70 pt-4">
                <CrewStack count={featured.attendeeCount} />
                <span className="btn-coral inline-flex shrink-0 items-center gap-1.5 px-5 py-2.5 text-sm group-hover:bg-coral-dark">
                  Open trip HQ <ArrowRightIcon className="h-4 w-4" />
                </span>
              </div>
            </div>
          </button>
        )}

        {/* ------- All trips: cover cards ------- */}
        {others.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between px-1">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">Trips on the board</h2>
              <span className="text-xs font-bold text-ink-soft">{others.length} planning now</span>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {others.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => router.push(`/t/${t.slug}`)}
                  className="card group overflow-hidden p-0 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className={`relative bg-gradient-to-br ${coverGradient(t.slug)} px-5 pb-4 pt-5`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-display text-2xl font-extrabold leading-tight tracking-tight text-white">
                        {t.name}
                      </span>
                      <ArrowRightIcon className="mt-1 h-5 w-5 shrink-0 text-white/70 transition group-hover:translate-x-0.5 group-hover:text-white" />
                    </div>
                    {t.location && (
                      <a
                        href={mapsUrl(t.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-bold text-white/90 underline decoration-dotted underline-offset-2"
                      >
                        <PinIcon className="h-3.5 w-3.5 text-amber" /> {t.location}
                      </a>
                    )}
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
                      <CalendarIcon className="h-4 w-4 shrink-0 text-coral" />
                      {formatDate(t.startDate)} – {formatDate(t.endDate)}
                    </div>
                    <div className="mt-3">
                      <CrewStack count={t.attendeeCount} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ------- Start a trip (opens the sheet) ------- */}
        <section className="card overflow-hidden p-0">
          <div className="flex items-center gap-4 p-6">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-deep to-teal text-white shadow-teal">
              <PaperPlaneIcon className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-teal-dark">Start a new adventure</h2>
              <p className="mt-0.5 text-sm font-medium text-ink-soft">
                Name it, place it, date it, share the link — that&apos;s the whole setup.
              </p>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-coral hidden shrink-0 px-6 py-3 sm:block">
              Create trip
            </button>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-coral mx-6 mb-6 w-[calc(100%-3rem)] py-3.5 text-base sm:hidden">
            Create a trip
          </button>
        </section>

        {/* ------- Organizer Pass pricing note (the one public place pricing appears)
             HELD BACK from the Nov 17 legal-pages deploy (dpl_8JHVV59rQLdWY6SXAcRYNtNeq8bC):
             deploy this ONLY together with MVP_PASS_ENABLED=1, once the Stripe
             restricted key + webhook exist. ------- */}
        <section className="card px-6 py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-teal-dark">
              ⭐ Organizer Pass
            </h2>
            <span className="font-display text-lg font-bold text-coral">
              $19.99 <span className="text-xs font-extrabold text-ink-soft">one-time per trip</span>
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium leading-relaxed text-ink-soft">
            Planning is free — the whole trip, forever. The optional pass is for the organizer who
            wants the money tools: see who&rsquo;s actually paid each split, run a group fund for
            the big shared costs, add co-organizers, pin an announcement, and lock the itinerary
            when it&rsquo;s final. One payment, one trip, no subscription — and your crew never
            pays anything. Refundable in full if the trip is cancelled before its start date.{" "}
            <a href="/terms" className="font-bold text-teal-dark underline decoration-amber decoration-2 underline-offset-2">
              Terms
            </a>
          </p>
        </section>

        <footer className="px-4 pb-2 pt-2 text-center">
          <p className="text-xs font-semibold text-ink-soft">
            MyVacaPlanner · the link is the key — share it only with your crew
          </p>
          <p className="mt-1.5 text-xs font-semibold text-ink-soft">
            <a href="/terms" className="underline decoration-dotted underline-offset-2">Terms</a>
            {" · "}
            <a href="/privacy" className="underline decoration-dotted underline-offset-2">Privacy</a>
            {" · "}
            <a href="/refunds" className="underline decoration-dotted underline-offset-2">Refunds</a>
          </p>
        </footer>
      </div>

      {/* ------- Create-trip sheet (modal on desktop, bottom sheet on mobile) ------- */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Create a trip"
        >
          <button
            aria-label="Close"
            onClick={() => setShowCreate(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
          />
          <div className="tab-fade relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-lift sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-teal-dark">Start a new adventure</h2>
                <p className="mt-1 text-sm font-medium text-ink-soft">
                  Name it, place it, date it, share the link — your crew does the rest.
                </p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-deep text-lg font-bold text-ink-soft transition hover:bg-cream-edge"
              >
                ×
              </button>
            </div>
            <form onSubmit={createTrip} className="mt-5 space-y-4">
              <div>
                <label className="label-warm" htmlFor="trip-name">What&apos;s the trip called?</label>
                <input
                  id="trip-name"
                  required
                  autoFocus
                  placeholder="e.g. Lake House Weekend"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-warm"
                />
              </div>
              <div>
                <label className="label-warm" htmlFor="organizer-name">And you are… (head honcho)</label>
                <input
                  id="organizer-name"
                  placeholder="Your name"
                  required
                  value={form.organizerName}
                  onChange={(e) => setForm({ ...form, organizerName: e.target.value })}
                  className="input-warm"
                />
                {contactsOk && (
                  <button
                    type="button"
                    onClick={fillOrganizerFromContacts}
                    className="mt-2 text-sm font-bold text-teal-dark underline decoration-amber decoration-2 underline-offset-2"
                  >
                    📇 Pick from contacts
                  </button>
                )}
              </div>
              <div>
                <label className="label-warm" htmlFor="trip-location">Where to?</label>
                <input
                  id="trip-location"
                  required
                  placeholder="e.g. Scottsdale, AZ"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="input-warm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
                <div>
                  <label className="label-warm" htmlFor="trip-start">Touchdown day</label>
                  <input
                    id="trip-start"
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="input-warm"
                  />
                </div>
                <div>
                  <label className="label-warm" htmlFor="trip-end">Heading home</label>
                  <input
                    id="trip-end"
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="input-warm"
                  />
                </div>
              </div>
              {error && (
                <p className="rounded-2xl bg-coral-soft px-4 py-2.5 text-sm font-bold text-coral-dark">{error}</p>
              )}
              <button type="submit" disabled={creating} className="btn-coral w-full py-3.5 text-lg">
                {creating ? "Packing the bags…" : "Create trip & get my link"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
