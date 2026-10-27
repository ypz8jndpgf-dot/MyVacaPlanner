"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { Attendee, Expense, Flight, Rsvp, ScheduleItem, Trip } from "@/lib/types";
import { computeBalances, dateRange, formatDate, formatMoney, formatTime, settleUp } from "@/lib/logic";

type Tab = "crew" | "schedule" | "flights" | "money";

const inputCls = "w-full rounded-xl border border-slate-300 px-3 py-2.5 bg-white";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1";

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export default function TripClient({ slug }: { slug: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("schedule");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/trips/${slug}`, "GET");
      setTrip(data.trip);
    } catch {
      setNotFound(true);
    }
  }, [slug]);

  useEffect(() => {
    load();
    setMeId(localStorage.getItem(`mvp:me:${slug}`));
  }, [load, slug]);

  const me: Attendee | undefined = trip?.attendees.find((a) => a.id === meId);
  const nameOf = useCallback(
    (id: string) => trip?.attendees.find((a) => a.id === id)?.name ?? "Someone",
    [trip]
  );

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function mutate(path: string, method: string, body: unknown, okMsg: string) {
    try {
      const data = await api(path, method, body);
      if (data.trip) setTrip(data.trip);
      else await load();
      flash(okMsg);
      return data;
    } catch (e) {
      flash(e instanceof Error ? e.message : "Something went wrong");
      throw e;
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-5xl">🏝️</p>
        <h1 className="mt-4 text-xl font-bold text-teal-dark">Trip not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          This link doesn&apos;t point to a trip. Check the link with whoever sent it.
        </p>
        <a href="/" className="mt-6 inline-block rounded-xl bg-teal px-5 py-2.5 font-semibold text-white">
          Go to MyVacaPlanner
        </a>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center text-slate-500">
        <Image src="/logo.webp" alt="" width={72} height={72} className="mx-auto rounded-2xl opacity-80" />
        <p className="mt-4">Loading your trip…</p>
      </main>
    );
  }

  const inCount = trip.attendees.filter((a) => a.rsvp === "in").length;

  return (
    <main className="mx-auto max-w-xl px-4 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 -mx-4 bg-teal px-4 pb-4 pt-4 shadow-md">
        <div className="flex items-center gap-3">
          <Image src="/logo.webp" alt="MyVacaPlanner" width={44} height={44} className="rounded-xl" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold text-white">{trip.name}</h1>
            <p className="truncate text-xs text-teal-mist">
              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              {trip.location ? ` · ${trip.location}` : ""} · {inCount} in
            </p>
          </div>
          <ShareButton slug={slug} />
        </div>
        <nav className="mt-4 grid grid-cols-4 gap-1 rounded-full bg-teal-dark p-1 text-center text-sm font-semibold">
          {(
            [
              ["schedule", "📅 Plan"],
              ["flights", "✈️ Flights"],
              ["money", "💸 Money"],
              ["crew", "👥 Crew"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full py-2 transition ${
                tab === key ? "bg-white text-teal-dark" : "text-teal-mist hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {!me && (
        <JoinCard
          slug={slug}
          tripName={trip.name}
          attendees={trip.attendees}
          onJoined={(attendee) => {
            localStorage.setItem(`mvp:me:${slug}`, attendee.id);
            const mine: string[] = JSON.parse(localStorage.getItem("mvp:trips") ?? "[]");
            localStorage.setItem("mvp:trips", JSON.stringify([...new Set([...mine, slug])]));
            setMeId(attendee.id);
            load();
          }}
        />
      )}

      {tab === "crew" && (
        <CrewTab trip={trip} me={me} mutate={mutate} setMeId={setMeId} slug={slug} />
      )}
      {tab === "schedule" && <ScheduleTab trip={trip} me={me} mutate={mutate} />}
      {tab === "flights" && <FlightsTab trip={trip} me={me} nameOf={nameOf} mutate={mutate} />}
      {tab === "money" && <MoneyTab trip={trip} me={me} nameOf={nameOf} mutate={mutate} />}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-teal-deep px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </main>
  );
}

function ShareButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${window.location.origin}/t/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "MyVacaPlanner trip", url });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={share}
      className="shrink-0 rounded-full bg-amber px-4 py-2 text-sm font-bold text-teal-deep shadow-sm"
    >
      {copied ? "Link copied ✓" : "Invite 🔗"}
    </button>
  );
}

function JoinCard({
  slug,
  tripName,
  attendees,
  onJoined,
}: {
  slug: string;
  tripName: string;
  attendees: Attendee[];
  onJoined: (a: Attendee) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function join(rsvp: Rsvp, joinName: string) {
    if (!joinName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const data = await api(`/api/trips/${slug}/attendees`, "POST", { name: joinName.trim(), rsvp });
      onJoined(data.attendee);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border-2 border-amber bg-amber-soft p-5 shadow-sm">
      <h2 className="font-bold text-teal-dark">You&apos;re invited to {tripName} 🎉</h2>
      <p className="mt-1 text-sm text-slate-600">Pick your name if you&apos;re already on the list, or join fresh:</p>
      {attendees.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {attendees.map((a) => (
            <button
              key={a.id}
              disabled={busy}
              onClick={() => join(a.rsvp, a.name)}
              className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-teal-dark shadow-sm"
            >
              {a.name}
              {a.isOrganizer ? " ⭐" : ""}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          disabled={busy || !name.trim()}
          onClick={() => join("in", name)}
          className="rounded-xl bg-coral py-2.5 font-bold text-white disabled:opacity-50"
        >
          I&apos;m in 🙌
        </button>
        <button
          disabled={busy || !name.trim()}
          onClick={() => join("out", name)}
          className="rounded-xl bg-white py-2.5 font-bold text-slate-600 shadow-sm disabled:opacity-50"
        >
          Can&apos;t make it
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-coral-dark">{error}</p>}
    </section>
  );
}

/* ---------------- Crew ---------------- */

type Mutate = (path: string, method: string, body: unknown, okMsg: string) => Promise<unknown>;

function CrewTab({
  trip,
  me,
  mutate,
  setMeId,
  slug,
}: {
  trip: Trip;
  me?: Attendee;
  mutate: Mutate;
  setMeId: (id: string | null) => void;
  slug: string;
}) {
  const groups: { key: Rsvp; title: string; emoji: string }[] = [
    { key: "in", title: "In", emoji: "🙌" },
    { key: "maybe", title: "Maybe", emoji: "🤔" },
    { key: "out", title: "Out", emoji: "😢" },
  ];
  return (
    <section className="mt-4 space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-bold text-teal-dark">
          The crew · {trip.attendees.filter((a) => a.rsvp === "in").length} in
        </h2>
        {me && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-slate-500">You&apos;re going as</span>
            <span className="font-bold text-teal-dark">{me.name}</span>
            <span className="flex gap-1">
              {(["in", "maybe", "out"] as Rsvp[]).map((r) => (
                <button
                  key={r}
                  onClick={() =>
                    mutate(`/api/trips/${trip.slug}/attendees`, "PATCH", { id: me.id, actorId: me.id, rsvp: r }, "RSVP updated")
                  }
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    me.rsvp === r ? "bg-teal text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {r === "in" ? "In" : r === "maybe" ? "Maybe" : "Out"}
                </button>
              ))}
            </span>
            <button
              className="ml-auto text-xs text-slate-400 underline"
              onClick={() => {
                localStorage.removeItem(`mvp:me:${slug}`);
                setMeId(null);
              }}
            >
              switch person
            </button>
          </div>
        )}
        {groups.map(({ key, title, emoji }) => {
          const people = trip.attendees.filter((a) => a.rsvp === key);
          if (people.length === 0) return null;
          return (
            <div key={key} className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {emoji} {title} · {people.length}
              </h3>
              <ul className="mt-1 divide-y divide-slate-100">
                {people.map((a) => (
                  <li key={a.id} className="flex items-center py-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-mist font-bold text-teal-dark">
                      {a.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="ml-3 font-semibold text-slate-700">
                      {a.name}
                      {a.isOrganizer && <span className="ml-2 rounded-full bg-amber-soft px-2 py-0.5 text-xs font-bold text-amber-dark">organizer</span>}
                      {me?.id === a.id && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                    </span>
                    {me?.isOrganizer && !a.isOrganizer && (
                      <button
                        className="ml-auto text-xs text-slate-400 underline"
                        onClick={() =>
                          mutate(`/api/trips/${trip.slug}/attendees`, "DELETE", { id: a.id, actorId: me.id }, "Removed")
                        }
                      >
                        remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-slate-400">
        Anyone with the trip link can join — share it from the Invite button up top.
      </p>
    </section>
  );
}

/* ---------------- Schedule ---------------- */

function ScheduleTab({ trip, me, mutate }: { trip: Trip; me?: Attendee; mutate: Mutate }) {
  const [form, setForm] = useState({ title: "", date: trip.startDate, time: "", location: "", notes: "" });
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const days = useMemo(() => dateRange(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of trip.schedule) {
      const arr = map.get(item.date) ?? [];
      arr.push(item);
      map.set(item.date, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => (a.time ?? "99") .localeCompare(b.time ?? "99"));
    return map;
  }, [trip.schedule]);
  const extraDays = [...byDay.keys()].filter((d) => !days.includes(d)).sort();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      await mutate(`/api/trips/${trip.slug}/schedule`, "PATCH", { id: editing.id, actorId: me!.id, ...form }, "Updated");
      setEditing(null);
    } else {
      await mutate(`/api/trips/${trip.slug}/schedule`, "POST", { actorId: me!.id, ...form }, "Added to the plan");
    }
    setForm({ title: "", date: trip.startDate, time: "", location: "", notes: "" });
  }

  function renderDay(day: string) {
    const items = byDay.get(day) ?? [];
    return (
      <div key={day} className="rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="font-bold text-teal-dark">{formatDate(day)}</h3>
        {items.length === 0 ? (
          <p className="mt-1 text-sm text-slate-400">Nothing planned yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl bg-teal-mist/60 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-800">{item.title}</span>
                    {item.time && <span className="ml-2 text-sm font-medium text-teal">{formatTime(item.time)}</span>}
                    {item.location && <div className="text-sm text-slate-500">📍 {item.location}</div>}
                    {item.notes && <div className="text-sm text-slate-500">{item.notes}</div>}
                  </div>
                  {me && (me.isOrganizer || item.createdBy === me.id) && (
                    <span className="flex shrink-0 gap-2 text-xs">
                      <button
                        className="font-semibold text-teal underline"
                        onClick={() => {
                          setEditing(item);
                          setForm({
                            title: item.title,
                            date: item.date,
                            time: item.time ?? "",
                            location: item.location ?? "",
                            notes: item.notes ?? "",
                          });
                        }}
                      >
                        edit
                      </button>
                      <button
                        className="font-semibold text-coral-dark underline"
                        onClick={() =>
                          mutate(`/api/trips/${trip.slug}/schedule`, "DELETE", { id: item.id, actorId: me.id }, "Deleted")
                        }
                      >
                        delete
                      </button>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <section className="mt-4 space-y-3">
      {days.map(renderDay)}
      {extraDays.map(renderDay)}
      {me ? (
        <form onSubmit={submit} className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="font-bold text-teal-dark">{editing ? "Edit plan" : "Add to the plan"}</h3>
          <div className="mt-3 space-y-3">
            <input required placeholder="What's happening? (Tee time, dinner, poker…)" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" required value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Time (optional)</label>
                <input type="time" value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputCls} />
              </div>
            </div>
            <input placeholder="Location (optional)" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} />
            <input placeholder="Notes (optional — reservation #, etc.)" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-xl bg-teal py-2.5 font-bold text-white">
                {editing ? "Save changes" : "Add"}
              </button>
              {editing && (
                <button type="button" className="rounded-xl bg-slate-100 px-4 font-semibold text-slate-500"
                  onClick={() => { setEditing(null); setForm({ title: "", date: trip.startDate, time: "", location: "", notes: "" }); }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      ) : (
        <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-500 shadow-sm">Join the trip to add plans.</p>
      )}
    </section>
  );
}

/* ---------------- Flights ---------------- */

function FlightsTab({
  trip,
  me,
  nameOf,
  mutate,
}: {
  trip: Trip;
  me?: Attendee;
  nameOf: (id: string) => string;
  mutate: Mutate;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    attendeeId: "",
    direction: "inbound" as "inbound" | "outbound",
    airline: "",
    flightNumber: "",
    date: trip.startDate,
    departTime: "",
    arriveTime: "",
    fromAirport: "",
    toAirport: "",
  });

  const arrivals = useMemo(
    () =>
      trip.flights
        .filter((f) => f.direction === "inbound")
        .sort((a, b) => `${a.date}T${a.arriveTime}`.localeCompare(`${b.date}T${b.arriveTime}`)),
    [trip.flights]
  );
  const departures = useMemo(
    () =>
      trip.flights
        .filter((f) => f.direction === "outbound")
        .sort((a, b) => `${a.date}T${a.departTime}`.localeCompare(`${b.date}T${b.departTime}`)),
    [trip.flights]
  );

  function FlightRow({ f, when }: { f: Flight; when: string }) {
    const mine = me && (me.isOrganizer || f.attendeeId === me.id);
    return (
      <li className="flex items-center gap-3 rounded-xl bg-teal-mist/60 px-3 py-2.5">
        <div className="text-center">
          <div className="text-lg font-extrabold leading-none text-teal-dark">{formatTime(when)}</div>
          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{formatDate(f.date)}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-800">
            {nameOf(f.attendeeId)} · {f.fromAirport} → {f.toAirport}
          </div>
          <div className="text-sm text-slate-500">
            {f.airline}
            {f.flightNumber ? ` ${f.flightNumber}` : ""} · departs {formatTime(f.departTime)}
          </div>
        </div>
        {mine && (
          <button
            className="shrink-0 text-xs font-semibold text-coral-dark underline"
            onClick={() => mutate(`/api/trips/${trip.slug}/flights`, "DELETE", { id: f.id, actorId: me!.id }, "Flight removed")}
          >
            delete
          </button>
        )}
      </li>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await mutate(
      `/api/trips/${trip.slug}/flights`,
      "POST",
      { actorId: me!.id, ...form, attendeeId: form.attendeeId || me!.id },
      "Flight added"
    );
    setShowForm(false);
  }

  return (
    <section className="mt-4 space-y-3">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="font-bold text-teal-dark">🛬 Arrivals board</h3>
        <p className="text-xs text-slate-400">Who lands when — plan the airport runs.</p>
        {arrivals.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No flights yet. Add yours below.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {arrivals.map((f) => (
              <FlightRow key={f.id} f={f} when={f.arriveTime} />
            ))}
          </ul>
        )}
      </div>

      {departures.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="font-bold text-teal-dark">🛫 Heading home</h3>
          <ul className="mt-2 space-y-2">
            {departures.map((f) => (
              <FlightRow key={f.id} f={f} when={f.departTime} />
            ))}
          </ul>
        </div>
      )}

      {me ? (
        showForm ? (
          <form onSubmit={submit} className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="font-bold text-teal-dark">Add a flight</h3>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Who&apos;s flying</label>
                  <select
                    value={form.attendeeId || me.id}
                    onChange={(e) => setForm({ ...form, attendeeId: e.target.value })}
                    className={inputCls}
                  >
                    {trip.attendees
                      .filter((a) => me.isOrganizer || a.id === me.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                          {a.id === me.id ? " (you)" : ""}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Direction</label>
                  <select
                    value={form.direction}
                    onChange={(e) => setForm({ ...form, direction: e.target.value as "inbound" | "outbound" })}
                    className={inputCls}
                  >
                    <option value="inbound">Arriving at the trip</option>
                    <option value="outbound">Heading home</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Airline (e.g. JetBlue)" value={form.airline}
                  onChange={(e) => setForm({ ...form, airline: e.target.value })} className={inputCls} />
                <input placeholder="Flight # (e.g. 1234)" value={form.flightNumber}
                  onChange={(e) => setForm({ ...form, flightNumber: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" required value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="From (e.g. BOS)" maxLength={4} value={form.fromAirport}
                  onChange={(e) => setForm({ ...form, fromAirport: e.target.value })} className={inputCls} />
                <input required placeholder="To (e.g. FLL)" maxLength={4} value={form.toAirport}
                  onChange={(e) => setForm({ ...form, toAirport: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Departs</label>
                  <input type="time" required value={form.departTime}
                    onChange={(e) => setForm({ ...form, departTime: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Arrives</label>
                  <input type="time" required value={form.arriveTime}
                    onChange={(e) => setForm({ ...form, arriveTime: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-xl bg-teal py-2.5 font-bold text-white">Add flight</button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-xl bg-slate-100 px-4 font-semibold text-slate-500">Cancel</button>
              </div>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full rounded-2xl bg-teal py-3 font-bold text-white shadow-sm">
            + Add a flight
          </button>
        )
      ) : (
        <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-500 shadow-sm">Join the trip to add your flights.</p>
      )}
    </section>
  );
}

/* ---------------- Money ---------------- */

function MoneyTab({
  trip,
  me,
  nameOf,
  mutate,
}: {
  trip: Trip;
  me?: Attendee;
  nameOf: (id: string) => string;
  mutate: Mutate;
}) {
  const balances = useMemo(() => computeBalances(trip), [trip]);
  const transfers = useMemo(() => settleUp(balances), [balances]);
  const [form, setForm] = useState({ description: "", amount: "", paidBy: "", splitAmong: [] as string[] });
  const inAttendees = trip.attendees.filter((a) => a.rsvp === "in");
  const splitPool = inAttendees.length > 0 ? inAttendees : trip.attendees;

  useEffect(() => {
    setForm((f) => ({
      ...f,
      paidBy: f.paidBy || me?.id || "",
      splitAmong: f.splitAmong.length > 0 ? f.splitAmong : splitPool.map((a) => a.id),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.attendees.length, me?.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const dollars = parseFloat(form.amount);
    if (Number.isNaN(dollars) || dollars <= 0) return;
    await mutate(
      `/api/trips/${trip.slug}/expenses`,
      "POST",
      {
        actorId: me!.id,
        description: form.description,
        amountCents: Math.round(dollars * 100),
        paidBy: form.paidBy || me!.id,
        splitAmong: form.splitAmong,
        date: trip.startDate,
      },
      "Expense added"
    );
    setForm({ description: "", amount: "", paidBy: me!.id, splitAmong: splitPool.map((a) => a.id) });
  }

  return (
    <section className="mt-4 space-y-3">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="font-bold text-teal-dark">Balances</h3>
        <ul className="mt-2 space-y-1.5">
          {trip.attendees.map((a) => {
            const net = balances.get(a.id) ?? 0;
            return (
              <li key={a.id} className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  {a.name}
                  {me?.id === a.id && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                </span>
                {net > 0 ? (
                  <span className="font-bold text-teal">is owed {formatMoney(net)}</span>
                ) : net < 0 ? (
                  <span className="font-bold text-coral-dark">owes {formatMoney(-net)}</span>
                ) : (
                  <span className="text-slate-400">settled ✓</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-2xl bg-teal p-4 shadow-sm">
        <h3 className="font-bold text-white">Settle up</h3>
        {transfers.length === 0 ? (
          <p className="mt-1 text-sm text-teal-mist">All square — nobody owes anybody. 🎉</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {transfers.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-xl bg-teal-dark px-3 py-2.5">
                <span className="text-sm text-white">
                  <b>{nameOf(t.fromId)}</b> pays <b>{nameOf(t.toId)}</b>{" "}
                  <b className="text-amber">{formatMoney(t.amountCents)}</b>
                </span>
                {me && (
                  <button
                    className="shrink-0 rounded-full bg-amber px-3 py-1.5 text-xs font-bold text-teal-deep"
                    onClick={() =>
                      mutate(
                        `/api/trips/${trip.slug}/payments`,
                        "POST",
                        { actorId: me.id, fromId: t.fromId, toId: t.toId, amountCents: t.amountCents },
                        "Marked as paid ✓"
                      )
                    }
                  >
                    Mark paid
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {trip.payments.length > 0 && (
          <div className="mt-3 border-t border-teal-light pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-mist">Paid so far</p>
            <ul className="mt-1 space-y-1 text-sm text-teal-mist">
              {trip.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>
                    ✓ {nameOf(p.fromId)} paid {nameOf(p.toId)} {formatMoney(p.amountCents)}
                  </span>
                  {me?.isOrganizer && (
                    <button
                      className="text-xs underline"
                      onClick={() =>
                        mutate(`/api/trips/${trip.slug}/payments`, "DELETE", { id: p.id, actorId: me.id }, "Payment undone")
                      }
                    >
                      undo
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {me ? (
        <form onSubmit={submit} className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="font-bold text-teal-dark">Add an expense</h3>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <input required placeholder="What for? (Greens fees, dinner…)" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
              <input required inputMode="decimal" placeholder="$0.00" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Who paid</label>
              <select value={form.paidBy || me.id} onChange={(e) => setForm({ ...form, paidBy: e.target.value })} className={inputCls}>
                {trip.attendees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.id === me.id ? " (you)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Split among</label>
              <div className="flex flex-wrap gap-2">
                {splitPool.map((a) => {
                  const on = form.splitAmong.includes(a.id);
                  return (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() =>
                        setForm({
                          ...form,
                          splitAmong: on
                            ? form.splitAmong.filter((id) => id !== a.id)
                            : [...form.splitAmong, a.id],
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                        on ? "bg-teal text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="submit" disabled={form.splitAmong.length === 0}
              className="w-full rounded-xl bg-coral py-2.5 font-bold text-white disabled:opacity-50">
              Add expense
            </button>
          </div>
        </form>
      ) : (
        <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-500 shadow-sm">Join the trip to add expenses.</p>
      )}

      {trip.expenses.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="font-bold text-teal-dark">Expenses</h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {[...trip.expenses]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((exp: Expense) => (
                <li key={exp.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="font-semibold text-slate-800">{exp.description}</div>
                    <div className="text-xs text-slate-400">
                      {nameOf(exp.paidBy)} paid · split {exp.splitAmong.length} ways
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700">{formatMoney(exp.amountCents)}</span>
                    {me && (me.isOrganizer || exp.createdBy === me.id) && (
                      <button
                        className="text-xs font-semibold text-coral-dark underline"
                        onClick={() =>
                          mutate(`/api/trips/${trip.slug}/expenses`, "DELETE", { id: exp.id, actorId: me.id }, "Expense deleted")
                        }
                      >
                        delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}
