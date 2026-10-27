"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatDate } from "@/lib/logic";
import {
  ArrowRightIcon,
  CalendarIcon,
  CoinsIcon,
  PaperPlaneIcon,
  PinIcon,
  PlaneIcon,
  SunIcon,
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

export default function HomePage() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [mySlugs, setMySlugs] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", location: "", startDate: "", endDate: "", organizerName: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/trips")
      .then((r) => r.json())
      .then((d) => setTrips(d.trips ?? []))
      .catch(() => {});
    try {
      setMySlugs(JSON.parse(localStorage.getItem("mvp:trips") ?? "[]"));
    } catch {}
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
  const mine = trips.filter((t) => mySlugs.includes(t.slug) && t.slug !== featured?.slug);

  return (
    <main className="pb-16">
      {/* ------- Hero: gradient sky, sun, dotted route ------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-deep via-teal to-teal-light">
        {/* sun glow */}
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-40 h-56 w-56 rounded-full bg-coral/20 blur-3xl" />
        <SunIcon className="animate-bob absolute right-6 top-8 h-14 w-14 text-amber" />
        {/* dotted flight route */}
        <svg
          viewBox="0 0 600 120"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 top-24 h-28 w-full text-white/25"
          aria-hidden
        >
          <path
            d="M-10 95 C 140 20, 300 115, 430 55 S 580 30, 615 45"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="0.1 11"
          />
        </svg>
        <PaperPlaneIcon className="animate-drift absolute right-[16%] top-[5.7rem] h-6 w-6 rotate-12 text-amber" />

        <div className="relative mx-auto max-w-xl px-4 pb-28 pt-12 text-center">
          {/* logo lockup */}
          <div className="flex flex-col items-center">
            <Image
              src="/logo.webp"
              alt="MyVacaPlanner"
              width={104}
              height={104}
              className="rounded-[1.9rem] shadow-lift ring-4 ring-white/25"
            />
            <div className="mt-4 font-display text-[2rem] font-bold leading-none tracking-tight text-white">
              My<span className="text-amber">Vaca</span>Planner
            </div>
            <div className="mt-1.5 text-[11px] font-extrabold uppercase tracking-[0.3em] text-teal-mist/90">
              myvacaplanner.com
            </div>
          </div>

          <h1 className="mt-8 font-display text-4xl font-bold leading-[1.12] text-white">
            Every trip. <span className="text-amber">One link.</span>
            <br />
            Zero group-text chaos.
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[15px] font-semibold leading-relaxed text-teal-mist">
            Who&apos;s in, who lands when, what&apos;s on, and who owes who — the whole trip in one
            friendly place. No accounts, no app install.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-extrabold text-white">
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

        {/* wave into the cream canvas */}
        <svg
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-12 w-full sm:h-16"
          aria-hidden
        >
          <path d="M0,50 C240,92 480,2 720,34 C960,66 1200,90 1440,42 L1440,90 L0,90 Z" fill="#FFF9F2" />
        </svg>
      </section>

      <div className="relative z-10 mx-auto -mt-14 max-w-xl space-y-5 px-4">
        {/* ------- Featured trip: boarding pass ------- */}
        {featured && (
          <button
            onClick={() => router.push(`/t/${featured.slug}`)}
            className="card group block w-full p-0 text-left shadow-lift transition duration-200 hover:-translate-y-1"
          >
            <div className="px-6 pb-5 pt-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-amber-dark">
                  <PlaneIcon className="h-4 w-4" /> Boarding pass · Featured trip
                </span>
                <span className="rounded-full bg-coral-soft px-2.5 py-1 text-[11px] font-extrabold text-coral-dark">
                  You&apos;re invited
                </span>
              </div>
              <div className="mt-2 font-display text-[2rem] font-bold leading-tight text-teal-dark">
                {featured.name} 🏌️
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
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
              {featured.location && (
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-teal">
                  <PinIcon className="h-4 w-4 text-coral" /> {featured.location}
                </div>
              )}
            </div>
            <div className="ticket-divider mx-6" />
            <div className="flex items-center justify-between px-6 py-4">
              <span className="text-sm font-semibold text-ink-soft">Gate opens now — come on in</span>
              <span className="btn-coral inline-flex items-center gap-1.5 px-5 py-2.5 text-sm group-hover:bg-coral-dark">
                Open trip HQ <ArrowRightIcon className="h-4 w-4" />
              </span>
            </div>
          </button>
        )}

        {/* ------- Your trips ------- */}
        {mine.length > 0 && (
          <section className="card p-5">
            <h2 className="font-display text-lg font-bold text-teal-dark">Your trips</h2>
            <p className="text-sm font-medium text-ink-soft">Jump back in — your crew missed you.</p>
            <ul className="mt-3 space-y-2">
              {mine.map((t) => (
                <li key={t.slug}>
                  <button
                    onClick={() => router.push(`/t/${t.slug}`)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-cream-deep/70 px-4 py-3 text-left ring-1 ring-cream-edge/60 transition hover:-translate-y-0.5 hover:bg-cream-deep hover:shadow-card"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white font-display text-lg font-bold text-coral shadow-sm">
                      {t.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-base font-bold text-teal-dark">{t.name}</span>
                      <span className="block text-xs font-semibold text-ink-soft">
                        {formatDate(t.startDate)} – {formatDate(t.endDate)}
                        {t.location ? ` · ${t.location}` : ""}
                      </span>
                    </span>
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-coral" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ------- Create a trip ------- */}
        <section className="card p-6">
          <h2 className="font-display text-2xl font-bold text-teal-dark">Start a new adventure</h2>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            Name it, date it, share the link — that&apos;s the whole setup. Your crew does the rest.
          </p>
          <form onSubmit={createTrip} className="mt-5 space-y-4">
            <div>
              <label className="label-warm" htmlFor="trip-name">What&apos;s the trip called?</label>
              <input
                id="trip-name"
                required
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
            </div>
            <div>
              <label className="label-warm" htmlFor="trip-location">Where to? <span className="font-semibold text-ink-soft">(optional)</span></label>
              <input
                id="trip-location"
                placeholder="e.g. Scottsdale, AZ"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input-warm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
        </section>

        <footer className="px-4 pb-2 pt-2 text-center">
          <svg viewBox="0 0 220 12" className="mx-auto h-3 w-56 text-teal/30" aria-hidden>
            <path d="M2 8 C 60 2, 160 12, 218 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="0.1 9" />
          </svg>
          <p className="mt-2 text-xs font-semibold text-ink-soft">
            MyVacaPlanner · the link is the key — share it only with your crew
          </p>
        </footer>
      </div>
    </main>
  );
}
