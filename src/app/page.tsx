"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatDate } from "@/lib/logic";

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
    <main className="mx-auto max-w-xl px-4 pb-16">
      <header className="flex flex-col items-center pt-10 pb-6 text-center">
        <Image src="/logo.webp" alt="MyVacaPlanner" width={96} height={96} className="rounded-3xl shadow-lg" />
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-teal-dark">
          My<span className="text-coral">Vaca</span>Planner
        </h1>
        <p className="mt-2 max-w-sm text-sm text-slate-600">
          Your whole trip in one link — who&apos;s in, who lands when, what&apos;s on, and who owes who.
          No accounts, no app install.
        </p>
      </header>

      {featured && (
        <button
          onClick={() => router.push(`/t/${featured.slug}`)}
          className="mb-4 block w-full overflow-hidden rounded-2xl bg-teal text-left shadow-md transition hover:bg-teal-light"
        >
          <div className="p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-amber">Featured trip</div>
            <div className="mt-1 text-2xl font-bold text-white">{featured.name} 🏌️</div>
            <div className="mt-1 text-sm text-teal-mist">
              {formatDate(featured.startDate)} – {formatDate(featured.endDate)}
              {featured.location ? ` · ${featured.location}` : ""} · {featured.attendeeCount} in so far
            </div>
            <div className="mt-3 inline-block rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white">
              Open trip HQ →
            </div>
          </div>
        </button>
      )}

      {mine.length > 0 && (
        <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Your trips</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {mine.map((t) => (
              <li key={t.slug}>
                <button
                  onClick={() => router.push(`/t/${t.slug}`)}
                  className="flex w-full items-center justify-between py-3 text-left"
                >
                  <span className="font-semibold text-teal-dark">{t.name}</span>
                  <span className="text-sm text-slate-500">
                    {formatDate(t.startDate)} – {formatDate(t.endDate)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-teal-dark">Plan a new trip</h2>
        <form onSubmit={createTrip} className="mt-3 space-y-3">
          <input
            required
            placeholder="Trip name (e.g. Lake House Weekend)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
          />
          <input
            placeholder="Your name (you're the organizer)"
            required
            value={form.organizerName}
            onChange={(e) => setForm({ ...form, organizerName: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
          />
          <input
            placeholder="Location (optional)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-500">
              Starts
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800"
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Ends
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800"
              />
            </label>
          </div>
          {error && <p className="text-sm font-medium text-coral-dark">{error}</p>}
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-xl bg-coral py-3 font-bold text-white shadow-sm transition hover:bg-coral-dark disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create trip & get my link"}
          </button>
        </form>
      </section>

      <footer className="mt-8 text-center text-xs text-slate-400">
        MyVacaPlanner · the link is the key — share it only with your crew
      </footer>
    </main>
  );
}
