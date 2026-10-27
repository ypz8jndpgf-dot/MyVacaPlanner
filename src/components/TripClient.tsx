"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { Attendee, Expense, Flight, Rsvp, ScheduleItem, Trip } from "@/lib/types";
import { computeBalances, dateRange, formatDate, formatMoney, formatTime, settleUp } from "@/lib/logic";
import {
  ArrowRightIcon,
  Avatar,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CoinsIcon,
  EmptyState,
  PinIcon,
  PlaneIcon,
  PlaneLandIcon,
  PlaneTakeoffIcon,
  SunIcon,
  UsersIcon,
} from "@/components/ui";

type Tab = "crew" | "schedule" | "flights" | "money";

const inputCls = "input-warm";
const labelCls = "label-warm";

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
      <main className="mx-auto max-w-xl px-4 py-20">
        <div className="card">
          <EmptyState
            icon={<span className="text-4xl">🏝️</span>}
            tint="#FFE9E6"
            title="Trip not found"
            line="This link doesn't point to a trip. Check the link with whoever sent it."
          >
            <a href="/" className="btn-teal mt-5 px-6 py-2.5">
              Go to MyVacaPlanner
            </a>
          </EmptyState>
        </div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <Image
          src="/logo.webp"
          alt=""
          width={80}
          height={80}
          className="mx-auto animate-pulse rounded-[1.6rem] shadow-card"
        />
        <p className="mt-5 font-display text-lg font-bold text-teal-dark">Unpacking your trip…</p>
      </main>
    );
  }

  const inCount = trip.attendees.filter((a) => a.rsvp === "in").length;
  const crewStack = [...trip.attendees].sort(
    (a, b) => ({ in: 0, maybe: 1, out: 2 })[a.rsvp] - ({ in: 0, maybe: 1, out: 2 })[b.rsvp]
  );

  return (
    <main className="mx-auto max-w-xl px-4 pb-24">
      {/* ------- Header ------- */}
      <header className="sticky top-0 z-20 -mx-4 overflow-hidden rounded-b-[1.75rem] bg-gradient-to-br from-teal-deep via-teal to-teal-light px-4 pb-4 pt-4 shadow-lift">
        <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-amber/20 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <Image
            src="/logo.webp"
            alt="MyVacaPlanner"
            width={46}
            height={46}
            className="rounded-2xl shadow-md ring-2 ring-white/30"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[22px] font-bold leading-tight text-white">{trip.name}</h1>
            <p className="truncate text-xs font-bold text-teal-mist/90">MyVacaPlanner trip HQ</p>
          </div>
          <ShareButton slug={slug} />
        </div>

        <div className="relative mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-extrabold text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 ring-1 ring-white/20">
            <CalendarIcon className="h-3.5 w-3.5" />
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </span>
          {trip.location && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5 ring-1 ring-white/20">
              <PinIcon className="h-3.5 w-3.5 text-amber" />
              {trip.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 ring-1 ring-white/20">
            <UsersIcon className="h-3.5 w-3.5" />
            {inCount} in
          </span>
        </div>

        {crewStack.length > 0 && (
          <div className="relative mt-3 flex items-center">
            <div className="flex -space-x-2">
              {crewStack.slice(0, 6).map((a) => (
                <Avatar key={a.id} name={a.name} size="sm" className="ring-2 ring-teal" />
              ))}
              {crewStack.length > 6 && (
                <span className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-amber font-display text-xs font-bold text-teal-deep ring-2 ring-teal">
                  +{crewStack.length - 6}
                </span>
              )}
            </div>
            <span className="ml-3 text-xs font-bold text-teal-mist">
              {crewStack.length === 1 ? "Just getting started" : "The crew so far"}
            </span>
          </div>
        )}

        <nav className="relative mt-4 grid grid-cols-4 gap-1 rounded-full bg-teal-deep/80 p-1 text-center shadow-inner">
          {(
            [
              ["schedule", "Plan", CalendarIcon],
              ["flights", "Flights", PlaneIcon],
              ["money", "Money", CoinsIcon],
              ["crew", "Crew", UsersIcon],
            ] as [Tab, string, React.ComponentType<{ className?: string }>][]
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-extrabold transition duration-200 ${
                tab === key ? "bg-white text-teal-dark shadow-md" : "text-teal-mist hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
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
        <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-center gap-2 rounded-full bg-teal-deep px-4 py-3 text-center text-sm font-bold text-white shadow-lift">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber text-teal-deep">
            <CheckIcon className="h-3 w-3" />
          </span>
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
    <button onClick={share} className="btn-amber shrink-0 px-4 py-2 text-sm">
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
    <section className="card mt-5 overflow-hidden p-0 shadow-lift">
      <div className="bg-gradient-to-r from-amber to-[#F8BE60] px-5 py-4">
        <h2 className="font-display text-xl font-bold text-teal-deep">You&apos;re invited to {tripName} 🎉</h2>
        <p className="mt-0.5 text-sm font-bold text-teal-deep/70">
          No account, no fuss — just claim your spot on the crew list.
        </p>
      </div>
      <div className="p-5">
        {attendees.length > 0 && (
          <>
            <p className="text-sm font-semibold text-ink-soft">Already on the list? Tap your name:</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {attendees.map((a) => (
                <button
                  key={a.id}
                  disabled={busy}
                  onClick={() => join(a.rsvp, a.name)}
                  className="inline-flex items-center gap-2 rounded-full bg-cream-deep py-1 pl-1 pr-3.5 font-display text-sm font-bold text-teal-dark shadow-sm ring-1 ring-cream-edge transition hover:-translate-y-0.5 hover:ring-amber disabled:opacity-50"
                >
                  <Avatar name={a.name} size="sm" />
                  {a.name}
                  {a.isOrganizer && <span className="text-amber-dark">★</span>}
                </button>
              ))}
            </div>
            <div className="my-4 flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-widest text-ink-soft/70">
              <span className="h-px flex-1 bg-cream-edge" /> New here? <span className="h-px flex-1 bg-cream-edge" />
            </div>
          </>
        )}
        <label className={labelCls} htmlFor="join-name">Your name</label>
        <input
          id="join-name"
          placeholder="e.g. Sam Rivera"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            disabled={busy || !name.trim()}
            onClick={() => join("in", name)}
            className="btn-coral py-3"
          >
            I&apos;m in 🙌
          </button>
          <button
            disabled={busy || !name.trim()}
            onClick={() => join("out", name)}
            className="btn-ghost py-3"
          >
            Can&apos;t make it
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-2.5 text-sm font-bold text-coral-dark">{error}</p>
        )}
      </div>
    </section>
  );
}

/* ---------------- Crew ---------------- */

type Mutate = (path: string, method: string, body: unknown, okMsg: string) => Promise<unknown>;

const RSVP_STYLE: Record<Rsvp, { chip: string; activeBtn: string }> = {
  in: { chip: "bg-teal text-white", activeBtn: "bg-teal text-white shadow-teal" },
  maybe: { chip: "bg-amber text-teal-deep", activeBtn: "bg-amber text-teal-deep shadow-amber" },
  out: { chip: "bg-slate-300 text-slate-600", activeBtn: "bg-slate-400 text-white" },
};

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
  const inCount = trip.attendees.filter((a) => a.rsvp === "in").length;
  return (
    <section className="mt-5 space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-teal-dark">The crew</h2>
          <span className="rounded-full bg-amber-soft px-3 py-1 font-display text-sm font-bold text-amber-dark">
            {inCount} in
          </span>
        </div>

        {me && (
          <div className="mt-4 rounded-3xl bg-cream-deep/70 p-3.5 ring-1 ring-cream-edge/60">
            <div className="flex items-center gap-3">
              <Avatar name={me.name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-ink-soft">You&apos;re going as</div>
                <div className="truncate font-display text-base font-bold text-teal-dark">{me.name}</div>
              </div>
              <button
                className="shrink-0 text-xs font-bold text-ink-soft underline decoration-amber decoration-2 underline-offset-2"
                onClick={() => {
                  localStorage.removeItem(`mvp:me:${slug}`);
                  setMeId(null);
                }}
              >
                switch person
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-white p-1 shadow-inner ring-1 ring-cream-edge/70">
              {(["in", "maybe", "out"] as Rsvp[]).map((r) => (
                <button
                  key={r}
                  onClick={() =>
                    mutate(`/api/trips/${trip.slug}/attendees`, "PATCH", { id: me.id, actorId: me.id, rsvp: r }, "RSVP updated")
                  }
                  className={`rounded-full py-1.5 text-xs font-extrabold transition ${
                    me.rsvp === r ? RSVP_STYLE[r].activeBtn : "text-ink-soft hover:text-teal-dark"
                  }`}
                >
                  {r === "in" ? "🙌 In" : r === "maybe" ? "🤔 Maybe" : "😢 Out"}
                </button>
              ))}
            </div>
          </div>
        )}

        {trip.attendees.length === 0 && (
          <EmptyState
            icon={<UsersIcon className="h-10 w-10" />}
            title="No one's here yet"
            line="Send that invite link around — first one in gets organizer bragging rights."
          />
        )}

        {groups.map(({ key, title, emoji }) => {
          const people = trip.attendees.filter((a) => a.rsvp === key);
          if (people.length === 0) return null;
          return (
            <div key={key} className="mt-5">
              <h3 className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${RSVP_STYLE[key].chip}`}>
                  {emoji} {title}
                </span>
                <span className="text-xs font-bold text-ink-soft">
                  {people.length} {people.length === 1 ? "person" : "people"}
                </span>
              </h3>
              <ul className="mt-2 space-y-1.5">
                {people.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-cream/70"
                  >
                    <Avatar name={a.name} size="md" />
                    <span className="min-w-0 flex-1 truncate font-display text-[15px] font-bold text-ink">
                      {a.name}
                      {me?.id === a.id && <span className="ml-1.5 text-xs font-bold text-ink-soft">(you)</span>}
                    </span>
                    {a.isOrganizer && (
                      <span className="shrink-0 rounded-full bg-amber-soft px-2.5 py-1 text-[11px] font-extrabold text-amber-dark">
                        ★ organizer
                      </span>
                    )}
                    {me?.isOrganizer && !a.isOrganizer && (
                      <button
                        className="shrink-0 text-xs font-bold text-coral-dark underline decoration-coral/50 underline-offset-2"
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
      <p className="px-4 text-center text-xs font-semibold text-ink-soft">
        Anyone with the trip link can join — pass it around from the Invite button up top.
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
  const allDays = [...days, ...extraDays];

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

  function renderDay(day: string, isLast: boolean) {
    const items = byDay.get(day) ?? [];
    const dayIndex = days.indexOf(day);
    return (
      <div key={day} className="flex gap-3">
        {/* timeline rail */}
        <div className="flex w-10 shrink-0 flex-col items-center">
          <span className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-amber-soft text-amber-dark shadow-sm ring-4 ring-cream">
            <SunIcon className="h-5 w-5" />
          </span>
          {!isLast && <span className="my-1 w-0 flex-1 border-l-2 border-dashed border-teal/25" />}
        </div>
        {/* day card */}
        <div className="card mb-4 min-w-0 flex-1 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-bold text-teal-dark">{formatDate(day)}</h3>
            {dayIndex >= 0 && (
              <span className="shrink-0 rounded-full bg-teal-mist px-2.5 py-0.5 text-[11px] font-extrabold text-teal-dark">
                Day {dayIndex + 1}
              </span>
            )}
          </div>
          {items.length === 0 ? (
            <div className="mt-2.5 rounded-2xl border-2 border-dashed border-cream-edge bg-cream/60 px-4 py-3.5 text-sm font-semibold text-ink-soft">
              Nothing planned yet — this day is wide open. 🌤️
            </div>
          ) : (
            <ul className="mt-2.5 space-y-2">
              {items.map((item) => (
                <li key={item.id} className="rounded-2xl bg-cream-deep/60 px-3.5 py-3 ring-1 ring-cream-edge/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.time && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-extrabold text-teal-dark shadow-sm">
                            <ClockIcon className="h-3.5 w-3.5 text-coral" />
                            {formatTime(item.time)}
                          </span>
                        )}
                        <span className="font-display text-[15px] font-bold text-ink">{item.title}</span>
                      </div>
                      {item.location && (
                        <div className="mt-1 flex items-center gap-1 text-sm font-semibold text-ink-soft">
                          <PinIcon className="h-3.5 w-3.5 text-coral" /> {item.location}
                        </div>
                      )}
                      {item.notes && <div className="mt-0.5 text-sm font-medium text-ink-soft">{item.notes}</div>}
                    </div>
                    {me && (me.isOrganizer || item.createdBy === me.id) && (
                      <span className="flex shrink-0 gap-1.5 text-[11px] font-extrabold">
                        <button
                          className="rounded-full bg-white px-2.5 py-1 text-teal-dark shadow-sm ring-1 ring-cream-edge transition hover:ring-amber"
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
                          className="rounded-full bg-white px-2.5 py-1 text-coral-dark shadow-sm ring-1 ring-cream-edge transition hover:ring-coral"
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
      </div>
    );
  }

  return (
    <section className="mt-5">
      <div>{allDays.map((day, i) => renderDay(day, i === allDays.length - 1))}</div>
      {me ? (
        <form onSubmit={submit} className="card mt-1 p-5">
          <h3 className="font-display text-lg font-bold text-teal-dark">{editing ? "Edit plan" : "Add to the plan"}</h3>
          <div className="mt-3 space-y-3.5">
            <div>
              <label className={labelCls}>What&apos;s happening?</label>
              <input required placeholder="Tee time, dinner, poker night…" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Which day</label>
                <input type="date" required value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>What time? (optional)</label>
                <input type="time" value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Where? (optional)</label>
              <input placeholder="Course, restaurant, the house…" value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Good-to-knows (optional)</label>
              <input placeholder="Reservation #, dress code, who's driving…" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-teal flex-1 py-3">
                {editing ? "Save changes" : "Add it in"}
              </button>
              {editing && (
                <button type="button" className="btn-ghost px-5"
                  onClick={() => { setEditing(null); setForm({ title: "", date: trip.startDate, time: "", location: "", notes: "" }); }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      ) : (
        <div className="card mt-1">
          <EmptyState
            icon={<CalendarIcon className="h-10 w-10" />}
            title="Want in on the planning?"
            line="Join the trip and you can add tee times, dinners, and everything in between."
          />
        </div>
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

  function FlightPass({ f, kind }: { f: Flight; kind: "inbound" | "outbound" }) {
    const mine = me && (me.isOrganizer || f.attendeeId === me.id);
    const bigTime = kind === "inbound" ? f.arriveTime : f.departTime;
    const bigLabel = kind === "inbound" ? "Lands" : "Takes off";
    const smallNote =
      kind === "inbound" ? `departs ${formatTime(f.departTime)}` : `arrives ${formatTime(f.arriveTime)}`;
    return (
      <article className="card overflow-hidden p-0 shadow-card">
        <div className="px-5 pb-4 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name={nameOf(f.attendeeId)} size="md" />
              <div className="min-w-0">
                <div className="truncate font-display text-[15px] font-bold leading-tight text-ink">
                  {nameOf(f.attendeeId)}
                </div>
                <div className="truncate text-xs font-bold text-ink-soft">
                  {f.airline}
                  {f.flightNumber ? ` ${f.flightNumber}` : ""}
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-soft">{bigLabel}</div>
              <div className="font-display text-[26px] font-bold leading-none text-teal-dark">{formatTime(bigTime)}</div>
              <div className="mt-0.5 text-xs font-bold text-ink-soft">{formatDate(f.date)}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="font-display text-xl font-bold tracking-wide text-ink">{f.fromAirport}</span>
            <span className="relative flex-1 border-t-[3px] border-dotted border-teal/30">
              <PlaneIcon className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-90 bg-white px-0.5 text-coral" />
            </span>
            <span className="font-display text-xl font-bold tracking-wide text-ink">{f.toAirport}</span>
          </div>
          <div className="mt-1 text-xs font-semibold text-ink-soft">{smallNote}</div>
        </div>
        <div className="ticket-divider mx-5" style={{ "--notch": "31px" } as React.CSSProperties} />
        <div className="flex items-center justify-between px-5 py-2.5 text-xs font-bold text-ink-soft">
          <span>
            {kind === "inbound" ? "🛬 Arrival" : "🛫 Departure"} · MyVacaPlanner boarding pass
          </span>
          {mine && (
            <button
              className="font-extrabold text-coral-dark underline decoration-coral/50 underline-offset-2"
              onClick={() => mutate(`/api/trips/${trip.slug}/flights`, "DELETE", { id: f.id, actorId: me!.id }, "Flight removed")}
            >
              delete
            </button>
          )}
        </div>
      </article>
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
    <section className="mt-5 space-y-6">
      <div>
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal text-white shadow-teal">
            <PlaneLandIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold leading-tight text-teal-dark">Arrivals board</h3>
            <p className="text-xs font-semibold text-ink-soft">Who lands when — plan the airport runs.</p>
          </div>
        </div>
        {arrivals.length === 0 ? (
          <div className="card mt-3">
            <EmptyState
              icon={<PlaneLandIcon className="h-10 w-10" />}
              title="No flights on the board yet"
              line="Add yours and the crew can plan airport runs, rideshares, and heroic coffee deliveries."
            />
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {arrivals.map((f) => (
              <FlightPass key={f.id} f={f} kind="inbound" />
            ))}
          </div>
        )}
      </div>

      {departures.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 px-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral text-white shadow-coral">
              <PlaneTakeoffIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-xl font-bold leading-tight text-teal-dark">Heading home</h3>
              <p className="text-xs font-semibold text-ink-soft">The sad part of the board. Sorry.</p>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {departures.map((f) => (
              <FlightPass key={f.id} f={f} kind="outbound" />
            ))}
          </div>
        </div>
      )}

      {me ? (
        showForm ? (
          <form onSubmit={submit} className="card p-5">
            <h3 className="font-display text-lg font-bold text-teal-dark">Add a flight</h3>
            <div className="mt-3 space-y-3.5">
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
                  <label className={labelCls}>Which way?</label>
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
                <div>
                  <label className={labelCls}>Airline</label>
                  <input required placeholder="e.g. JetBlue" value={form.airline}
                    onChange={(e) => setForm({ ...form, airline: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Flight #</label>
                  <input placeholder="e.g. 1234" value={form.flightNumber}
                    onChange={(e) => setForm({ ...form, flightNumber: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Flying on</label>
                <input type="date" required value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>From</label>
                  <input required placeholder="BOS" maxLength={4} value={form.fromAirport}
                    onChange={(e) => setForm({ ...form, fromAirport: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>To</label>
                  <input required placeholder="FLL" maxLength={4} value={form.toAirport}
                    onChange={(e) => setForm({ ...form, toAirport: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Wheels up</label>
                  <input type="time" required value={form.departTime}
                    onChange={(e) => setForm({ ...form, departTime: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Touchdown</label>
                  <input type="time" required value={form.arriveTime}
                    onChange={(e) => setForm({ ...form, arriveTime: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-teal flex-1 py-3">Add flight</button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="btn-ghost px-5">Cancel</button>
              </div>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)} className="btn-teal w-full py-3.5">
            + Add a flight
          </button>
        )
      ) : (
        <div className="card">
          <EmptyState
            icon={<PlaneIcon className="h-10 w-10" />}
            tint="#FFE9E6"
            title="Flying in?"
            line="Join the trip to put your flight on the board so the crew knows when to expect you."
          />
        </div>
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
    <section className="mt-5 space-y-5">
      {/* Balances */}
      <div className="card p-5">
        <h3 className="font-display text-xl font-bold text-teal-dark">Who&apos;s up, who&apos;s down</h3>
        <p className="text-sm font-medium text-ink-soft">The trip tab, kept honest.</p>
        <ul className="mt-3 space-y-1">
          {trip.attendees.map((a) => {
            const net = balances.get(a.id) ?? 0;
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-cream/70">
                <Avatar name={a.name} size="md" />
                <span className="min-w-0 flex-1 truncate font-display text-[15px] font-bold text-ink">
                  {a.name}
                  {me?.id === a.id && <span className="ml-1.5 text-xs font-bold text-ink-soft">(you)</span>}
                </span>
                {net > 0 ? (
                  <span className="shrink-0 rounded-full bg-teal-mist px-3 py-1.5 text-sm font-extrabold text-teal-dark">
                    is owed {formatMoney(net)}
                  </span>
                ) : net < 0 ? (
                  <span className="shrink-0 rounded-full bg-coral-soft px-3 py-1.5 text-sm font-extrabold text-coral-dark">
                    owes {formatMoney(-net)}
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cream-deep px-3 py-1.5 text-sm font-extrabold text-ink-soft">
                    <CheckIcon className="h-3.5 w-3.5" /> settled
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Settle up */}
      <div>
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber text-teal-deep shadow-amber">
            <CoinsIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold leading-tight text-teal-dark">Settle up</h3>
            <p className="text-xs font-semibold text-ink-soft">Fewest handshakes possible.</p>
          </div>
        </div>
        {transfers.length === 0 ? (
          <div className="mt-3 overflow-hidden rounded-3xl bg-gradient-to-br from-teal to-teal-light p-5 shadow-teal">
            <p className="font-display text-lg font-bold text-white">All square 🎉</p>
            <p className="mt-0.5 text-sm font-semibold text-teal-mist">
              Nobody owes anybody a cent. Beautiful thing.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {transfers.map((t, i) => (
              <li key={i} className="card flex items-center gap-2.5 p-4">
                <Avatar name={nameOf(t.fromId)} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[15px] font-bold leading-tight text-ink">
                    {nameOf(t.fromId)}
                  </span>
                  <span className="block text-xs font-bold text-ink-soft">pays {nameOf(t.toId)}</span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-soft text-amber-dark">
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
                <Avatar name={nameOf(t.toId)} size="md" />
                <span className="ml-1 shrink-0 font-display text-xl font-bold text-teal-dark">
                  {formatMoney(t.amountCents)}
                </span>
                {me && (
                  <button
                    className="btn-amber shrink-0 px-4 py-2 text-sm"
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
          <div className="card mt-3 p-5">
            <h4 className="text-xs font-extrabold uppercase tracking-[0.18em] text-ink-soft">Paid &amp; settled</h4>
            <ul className="mt-2.5 space-y-2">
              {trip.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 text-sm font-semibold text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-mist text-teal-dark">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    {nameOf(p.fromId)} paid {nameOf(p.toId)}{" "}
                    <b className="text-teal-dark">{formatMoney(p.amountCents)}</b>
                  </span>
                  {me?.isOrganizer && (
                    <button
                      className="shrink-0 text-xs font-bold text-ink-soft underline decoration-amber decoration-2 underline-offset-2"
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

      {/* Add expense */}
      {me ? (
        <form onSubmit={submit} className="card p-5">
          <h3 className="font-display text-lg font-bold text-teal-dark">Add an expense</h3>
          <div className="mt-3 space-y-3.5">
            <div>
              <label className={labelCls}>What was it for?</label>
              <input required placeholder="Greens fees, group dinner, the big grocery run…" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>How much?</label>
                <input required inputMode="decimal" placeholder="$0.00" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Who covered it?</label>
                <select value={form.paidBy || me.id} onChange={(e) => setForm({ ...form, paidBy: e.target.value })} className={inputCls}>
                  {trip.attendees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.id === me.id ? " (you)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Split it among</label>
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
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-display text-sm font-bold transition ${
                        on
                          ? "bg-teal text-white shadow-teal"
                          : "bg-cream-deep text-ink-soft ring-1 ring-cream-edge hover:ring-amber"
                      }`}
                    >
                      {on && <CheckIcon className="h-3.5 w-3.5" />}
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="submit" disabled={form.splitAmong.length === 0}
              className="btn-coral w-full py-3">
              Add expense
            </button>
          </div>
        </form>
      ) : (
        <div className="card">
          <EmptyState
            icon={<CoinsIcon className="h-10 w-10" />}
            title="Keeping score?"
            line="Join the trip to log expenses and settle up without a single spreadsheet."
          />
        </div>
      )}

      {/* Expense history */}
      {trip.expenses.length > 0 && (
        <div className="card p-5">
          <h3 className="font-display text-lg font-bold text-teal-dark">The receipts</h3>
          <ul className="mt-2 divide-y divide-cream-edge/70">
            {[...trip.expenses]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((exp: Expense) => (
                <li key={exp.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-display text-[15px] font-bold text-ink">{exp.description}</div>
                    <div className="text-xs font-semibold text-ink-soft">
                      {nameOf(exp.paidBy)} paid · split {exp.splitAmong.length} ways
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-display text-base font-bold text-teal-dark">{formatMoney(exp.amountCents)}</span>
                    {me && (me.isOrganizer || exp.createdBy === me.id) && (
                      <button
                        className="text-xs font-extrabold text-coral-dark underline decoration-coral/50 underline-offset-2"
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
