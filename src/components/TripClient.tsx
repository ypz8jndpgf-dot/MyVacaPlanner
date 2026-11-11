"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Attendee, Expense, Flight, LodgingInfo, PackingItem, Poll, Rsvp, ScheduleItem, ShoppingItem, Trip } from "@/lib/types";
import { computeBalances, dateRange, formatDate, formatMoney, formatTime, settleUp } from "@/lib/logic";
import {
  ArrowRightIcon,
  Avatar,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CoinsIcon,
  EmptyState,
  HomeIcon,
  PinIcon,
  mapsUrl,
  PlaneIcon,
  PlaneLandIcon,
  PlaneTakeoffIcon,
  SunIcon,
  UsersIcon,
} from "@/components/ui";

type Tab = "crew" | "schedule" | "flights" | "money" | "stay";

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
            <Link href="/" className="btn-teal mt-5 px-6 py-2.5">
              Go to MyVacaPlanner
            </Link>
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
            <a
              href={mapsUrl(trip.location)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5 ring-1 ring-white/20 underline decoration-dotted underline-offset-2"
            >
              <PinIcon className="h-3.5 w-3.5 text-amber" />
              {trip.location}
            </a>
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

        <nav className="relative mt-4 grid grid-cols-5 gap-1 rounded-full bg-teal-deep/80 p-1 text-center shadow-inner">
          {(
            [
              ["schedule", "Plan", CalendarIcon],
              ["flights", "Flights", PlaneIcon],
              ["stay", "Stay", HomeIcon],
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

      <WeatherStrip slug={slug} />

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
      {tab === "schedule" && <ScheduleTab trip={trip} me={me} nameOf={nameOf} mutate={mutate} />}
      {tab === "flights" && <FlightsTab trip={trip} me={me} nameOf={nameOf} mutate={mutate} />}
      {tab === "stay" && <LodgingTab trip={trip} me={me} nameOf={nameOf} mutate={mutate} />}
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

/** Optional Venmo / Cash App handles on your own crew card, so settle-up
 *  rows in the Money tab can deep-link straight into a payment. */
function PayHandlesEditor({ trip, me, mutate }: { trip: Trip; me: Attendee; mutate: Mutate }) {
  const [venmo, setVenmo] = useState(me.venmo ?? "");
  const [cashapp, setCashapp] = useState(me.cashapp ?? "");
  const [open, setOpen] = useState(false);
  const dirty = venmo.trim() !== (me.venmo ?? "") || cashapp.trim() !== (me.cashapp ?? "");
  const summary = [me.venmo ? `Venmo @${me.venmo}` : null, me.cashapp ? `Cash App $${me.cashapp}` : null]
    .filter(Boolean)
    .join(" · ");

  if (!open) {
    return (
      <button
        className="mt-3 w-full rounded-full bg-white px-4 py-2 text-xs font-extrabold text-teal-dark shadow-sm ring-1 ring-cream-edge transition hover:ring-amber"
        onClick={() => {
          setVenmo(me.venmo ?? "");
          setCashapp(me.cashapp ?? "");
          setOpen(true);
        }}
      >
        {summary ? `💸 ${summary} — tap to edit` : "💸 Add Venmo / Cash App so the crew can pay you in one tap"}
      </button>
    );
  }
  return (
    <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-cream-edge/70">
      <div className="text-xs font-extrabold text-teal-dark">Get paid in one tap</div>
      <p className="mt-0.5 text-[11px] font-semibold text-ink-soft">
        Shown on settle-up rows so anyone who owes you can pay the exact amount in Venmo or Cash App.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 [&>*]:min-w-0">
        <input
          value={venmo}
          onChange={(e) => setVenmo(e.target.value)}
          placeholder="Venmo @username"
          className="input-warm !px-3 !py-2 text-sm"
          autoComplete="off"
        />
        <input
          value={cashapp}
          onChange={(e) => setCashapp(e.target.value)}
          placeholder="Cash App $cashtag"
          className="input-warm !px-3 !py-2 text-sm"
          autoComplete="off"
        />
      </div>
      <div className="mt-2 flex gap-2">
        <button
          className="btn-teal flex-1 py-2 text-sm"
          disabled={!dirty}
          onClick={async () => {
            await mutate(
              `/api/trips/${trip.slug}/attendees`,
              "PATCH",
              { id: me.id, actorId: me.id, venmo, cashapp },
              "Payment handles saved"
            );
            setOpen(false);
          }}
        >
          Save handles
        </button>
        <button className="btn-ghost px-4 py-2 text-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

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
            <PayHandlesEditor trip={trip} me={me} mutate={mutate} />
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
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15px] font-bold text-ink">
                        {a.name}
                        {me?.id === a.id && <span className="ml-1.5 text-xs font-bold text-ink-soft">(you)</span>}
                      </span>
                      {(a.venmo || a.cashapp) && (
                        <span className="block truncate text-[11px] font-bold text-ink-soft">
                          {[a.venmo ? `Venmo @${a.venmo}` : null, a.cashapp ? `Cash App $${a.cashapp}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
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

function ScheduleTab({
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
  const [form, setForm] = useState({ title: "", date: trip.startDate, time: "", location: "", notes: "" });
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [editForm, setEditForm] = useState({ title: "", date: "", time: "", location: "", notes: "" });
  const days = useMemo(() => dateRange(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of trip.schedule) {
      const arr = map.get(item.date) ?? [];
      arr.push(item);
      map.set(item.date, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
    return map;
  }, [trip.schedule]);
  const extraDays = [...byDay.keys()].filter((d) => !days.includes(d)).sort();
  const allDays = [...days, ...extraDays];

  function startEdit(item: ScheduleItem) {
    setEditing(item);
    setEditForm({
      title: item.title,
      date: item.date,
      time: item.time ?? "",
      location: item.location ?? "",
      notes: item.notes ?? "",
    });
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    await mutate(`/api/trips/${trip.slug}/schedule`, "POST", { actorId: me!.id, ...form }, "Added to the plan");
    setForm({ title: "", date: trip.startDate, time: "", location: "", notes: "" });
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    await mutate(
      `/api/trips/${trip.slug}/schedule`,
      "PATCH",
      { id: editing.id, actorId: me!.id, ...editForm },
      "Updated"
    );
    setEditing(null);
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
              {items.map((item) =>
                editing?.id === item.id ? (
                  <li key={item.id} className="rounded-2xl bg-white px-3.5 py-3 ring-2 ring-amber">
                    <form onSubmit={submitEdit} className="space-y-2.5">
                      <div>
                        <label className={labelCls}>What&apos;s happening?</label>
                        <input
                          required
                          autoFocus
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
                        <div>
                          <label className={labelCls}>Which day</label>
                          <input
                            type="date"
                            required
                            value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>What time? (optional)</label>
                          <input
                            type="time"
                            value={editForm.time}
                            onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                            className={inputCls}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Where? (optional)</label>
                        <input
                          value={editForm.location}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Good-to-knows (optional)</label>
                        <input
                          value={editForm.notes}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn-teal flex-1 py-2.5">
                          Save changes
                        </button>
                        <button type="button" className="btn-ghost px-5" onClick={() => setEditing(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
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
                            <PinIcon className="h-3.5 w-3.5 shrink-0 text-coral" />
                            <a
                              href={mapsUrl(
                                trip.location && !item.location.toLowerCase().includes(trip.location.toLowerCase())
                                  ? `${item.location}, ${trip.location}`
                                  : item.location
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline decoration-dotted underline-offset-2"
                            >
                              {item.location}
                            </a>
                          </div>
                        )}
                        {item.notes && <div className="mt-0.5 text-sm font-medium text-ink-soft">{item.notes}</div>}
                      </div>
                      {me && (me.isOrganizer || item.createdBy === me.id) && (
                        <span className="flex shrink-0 gap-1.5 text-[11px] font-extrabold">
                          <button
                            className="rounded-full bg-white px-2.5 py-1 text-teal-dark shadow-sm ring-1 ring-cream-edge transition hover:ring-amber"
                            onClick={() => startEdit(item)}
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
                )
              )}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="mt-5">
      <EventsStrip trip={trip} me={me} mutate={mutate} />
      <ActivitiesStrip trip={trip} me={me} mutate={mutate} />
      <MapSection trip={trip} />
      <PollsSection trip={trip} me={me} nameOf={nameOf} mutate={mutate} />
      <div className="mb-4 flex justify-end">
        <a
          href={`/api/trips/${trip.slug}/ics`}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-extrabold text-teal-dark shadow-sm ring-1 ring-cream-edge transition hover:ring-amber"
        >
          <CalendarIcon className="h-3.5 w-3.5" /> Add the plan to my calendar
        </a>
      </div>
      <div>{allDays.map((day, i) => renderDay(day, i === allDays.length - 1))}</div>
      {me ? (
        <form onSubmit={submitAdd} className="card mt-1 p-5">
          <h3 className="font-display text-lg font-bold text-teal-dark">Add to the plan</h3>
          <div className="mt-3 space-y-3.5">
            <div>
              <label className={labelCls}>What&apos;s happening?</label>
              <input required placeholder="Tee time, dinner, poker night…" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
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
            <button type="submit" className="btn-teal w-full py-3">
              Add it in
            </button>
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

function LodgingTab({
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
  const lodging = trip.lodging;
  const empty: LodgingInfo = {
    name: "",
    address: "",
    checkIn: "",
    checkOut: "",
    accessCode: "",
    wifi: "",
    contact: "",
    url: "",
    notes: "",
  };
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<LodgingInfo>(empty);

  function startEdit() {
    setForm({ ...empty, ...(lodging ?? {}) });
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await mutate(`/api/trips/${trip.slug}/lodging`, "PATCH", { actorId: me!.id, ...form }, "Stay saved");
    setEditing(false);
  }

  const rows: [string, string | undefined][] = lodging
    ? [
        ["Check-in", lodging.checkIn],
        ["Check-out", lodging.checkOut],
        ["Door code", lodging.accessCode],
        ["Wi-Fi", lodging.wifi],
        ["Host / contact", lodging.contact],
      ]
    : [];

  return (
    <section className="mt-5">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
        <HomeIcon className="h-5 w-5 text-coral" /> Where we&rsquo;re staying
      </h2>

      {editing && me ? (
        <form onSubmit={save} className="space-y-3 rounded-2xl bg-cream-deep/60 px-4 py-4 ring-1 ring-cream-edge/50">
          <div>
            <label className={labelCls}>Stay name — Airbnb, hotel, …</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Airbnb" />
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} placeholder="123 Main St, Philadelphia, PA" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Check-in</label>
              <input value={form.checkIn ?? ""} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} className={inputCls} placeholder="Fri 3pm" />
            </div>
            <div>
              <label className={labelCls}>Check-out</label>
              <input value={form.checkOut ?? ""} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} className={inputCls} placeholder="Mon 11am" />
            </div>
            <div>
              <label className={labelCls}>Door / gate code</label>
              <input value={form.accessCode ?? ""} onChange={(e) => setForm({ ...form, accessCode: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Wi-Fi</label>
              <input value={form.wifi ?? ""} onChange={(e) => setForm({ ...form, wifi: e.target.value })} className={inputCls} placeholder="Network · password" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Host / contact</label>
            <input value={form.contact ?? ""} onChange={(e) => setForm({ ...form, contact: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Listing / booking link</label>
            <input value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} className={inputCls} placeholder="https://www.airbnb.com/rooms/…" />
          </div>
          <div>
            <label className={labelCls}>Notes (parking, house rules, …)</label>
            <input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-teal flex-1 py-2.5">
              Save stay
            </button>
            <button type="button" className="btn-ghost px-5" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
          {lodging && (
            <button
              type="button"
              className="w-full text-center text-xs font-bold text-coral-dark underline decoration-dotted underline-offset-2"
              onClick={async () => {
                await mutate(`/api/trips/${trip.slug}/lodging`, "PATCH", { actorId: me!.id, clear: true }, "Stay removed");
                setEditing(false);
              }}
            >
              Remove this stay
            </button>
          )}
        </form>
      ) : lodging ? (
        <div className="rounded-2xl bg-cream-deep/60 px-4 py-4 ring-1 ring-cream-edge/50">
          <div className="flex items-start justify-between gap-2">
            <div className="font-display text-xl font-bold text-ink">{lodging.name}</div>
            {me && (
              <button
                className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-teal-dark shadow-sm ring-1 ring-cream-edge transition hover:ring-amber"
                onClick={startEdit}
              >
                edit
              </button>
            )}
          </div>
          {lodging.address && (
            <div className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-ink-soft">
              <PinIcon className="h-3.5 w-3.5 shrink-0 text-coral" />
              <a
                href={mapsUrl(
                  trip.location && !lodging.address.toLowerCase().includes(trip.location.toLowerCase())
                    ? `${lodging.address}, ${trip.location}`
                    : lodging.address
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-2"
              >
                {lodging.address}
              </a>
            </div>
          )}
          <dl className="mt-3 space-y-1.5">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex gap-2 text-sm">
                  <dt className="w-28 shrink-0 font-extrabold text-ink">{k}</dt>
                  <dd className="font-medium text-ink-soft">{v}</dd>
                </div>
              ))}
          </dl>
          {lodging.url && (
            <a
              href={lodging.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-extrabold text-teal-dark shadow-sm ring-1 ring-cream-edge transition hover:ring-amber"
            >
              View the listing <ArrowRightIcon className="h-3.5 w-3.5" />
            </a>
          )}
          {lodging.notes && <p className="mt-3 text-sm font-medium text-ink-soft">{lodging.notes}</p>}
          {lodging.updatedBy && (
            <p className="mt-3 text-xs font-semibold text-ink-soft/70">Saved by {nameOf(lodging.updatedBy)}</p>
          )}
        </div>
      ) : (
        <div>
          <EmptyState
            icon={<HomeIcon className="h-8 w-8" />}
            title="No stay saved yet"
            line="Whoever booked the Airbnb or hotel can drop the address, door code, and check-in details here so the whole crew has them."
          />
          {me && (
            <button className="btn-teal mt-3 w-full py-2.5" onClick={startEdit}>
              + Add the stay
            </button>
          )}
        </div>
      )}
    </section>
  );
}

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
              <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
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
              <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
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
              <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
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
              <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
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
              <li key={i} className="card p-4">
                <div className="flex items-center gap-2.5">
                <Avatar name={nameOf(t.fromId)} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[15px] font-bold leading-tight text-ink">
                    {nameOf(t.fromId)}
                  </span>
                  <span className="block truncate text-xs font-bold text-ink-soft">pays {nameOf(t.toId)}</span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-soft text-amber-dark">
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
                <Avatar name={nameOf(t.toId)} size="md" />
                <span className="ml-1 shrink-0 font-display text-xl font-bold text-teal-dark">
                  {formatMoney(t.amountCents)}
                </span>
                </div>
                {(() => {
                  const recipient = trip.attendees.find((a) => a.id === t.toId);
                  const dollars = (t.amountCents / 100).toFixed(2);
                  const hasHandles = Boolean(recipient?.venmo || recipient?.cashapp);
                  if (!hasHandles && !me) return null;
                  const chip =
                    "rounded-full bg-teal-mist px-3.5 py-1.5 text-xs font-extrabold text-teal-dark transition hover:bg-amber-soft hover:text-amber-dark";
                  return (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-cream-edge pt-3">
                      {recipient?.venmo && (
                        <a
                          className={chip}
                          href={`https://venmo.com/${recipient.venmo}?txn=pay&amount=${dollars}&note=${encodeURIComponent(`${trip.name} — settle up`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Pay with Venmo
                        </a>
                      )}
                      {recipient?.cashapp && (
                        <a
                          className={chip}
                          href={`https://cash.app/$${recipient.cashapp}/${dollars}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Pay with Cash App
                        </a>
                      )}
                      {!hasHandles && me?.id === t.toId && (
                        <span className="text-xs font-bold text-ink-soft">
                          Add your Venmo or Cash App in the Crew tab so {nameOf(t.fromId).split(" ")[0]} can pay
                          you in one tap.
                        </span>
                      )}
                      {me && (
                        <button
                          className="btn-amber ml-auto shrink-0 px-4 py-2 text-sm"
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
                    </div>
                  );
                })()}
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
            <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
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

      {/* Shopping list */}
      <ShoppingSection trip={trip} me={me} nameOf={nameOf} mutate={mutate} />

      {/* To-bring / packing list */}
      <PackingSection trip={trip} me={me} nameOf={nameOf} mutate={mutate} />
    </section>
  );
}

/* ---------------- Shopping list ---------------- */

function ShoppingSection({
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
  const [form, setForm] = useState({ name: "", quantity: "" });
  const items = useMemo(() => {
    const list = [...(trip.shopping ?? [])];
    // Still-to-get first, picked-up last; oldest first within each group.
    list.sort((a, b) => Number(a.checked) - Number(b.checked) || a.createdAt - b.createdAt);
    return list;
  }, [trip.shopping]);
  const pickedUp = items.filter((i) => i.checked).length;
  const firstName = (id: string) => nameOf(id).split(" ")[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await mutate(
      `/api/trips/${trip.slug}/shopping`,
      "POST",
      { actorId: me!.id, name: form.name, quantity: form.quantity || undefined },
      "Added to the list"
    );
    setForm({ name: "", quantity: "" });
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-teal-dark">🛒 Shopping list</h3>
        {items.length > 0 && (
          <span className="shrink-0 rounded-full bg-amber-soft px-3 py-1 font-display text-sm font-bold text-amber-dark">
            {pickedUp} of {items.length} picked up
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-3 rounded-2xl border-2 border-dashed border-cream-edge bg-cream/60 px-4 py-3.5 text-sm font-semibold text-ink-soft">
          Nothing on the list yet — add what the house needs.
        </div>
      ) : (
        <ul className="mt-1 divide-y divide-cream-edge/70">
          {items.map((item: ShoppingItem) => {
            const meta: string[] = [];
            if (item.quantity) meta.push(item.quantity);
            if (item.note) meta.push(item.note);
            meta.push(`added by ${firstName(item.createdBy)}`);
            if (item.checked && item.checkedBy) meta.push(`picked up by ${firstName(item.checkedBy)}`);
            return (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <button
                  type="button"
                  disabled={!me}
                  aria-label={item.checked ? "Mark as not picked up" : "Mark as picked up"}
                  onClick={() =>
                    mutate(
                      `/api/trips/${trip.slug}/shopping`,
                      "PATCH",
                      { id: item.id, actorId: me!.id, checked: !item.checked },
                      item.checked ? "Back on the list" : "Picked up ✓"
                    )
                  }
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-2 transition ${
                    item.checked
                      ? "bg-teal text-white ring-teal"
                      : "bg-white ring-cream-edge hover:ring-amber disabled:hover:ring-cream-edge"
                  }`}
                >
                  {item.checked && <CheckIcon className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate font-display text-[15px] font-bold ${
                      item.checked ? "text-ink-soft line-through" : "text-ink"
                    }`}
                  >
                    {item.name}
                  </div>
                  <div className="truncate text-xs font-semibold text-ink-soft">{meta.join(" · ")}</div>
                </div>
                {me && (me.isOrganizer || item.createdBy === me.id) && (
                  <button
                    className="shrink-0 text-xs font-extrabold text-coral-dark underline decoration-coral/50 underline-offset-2"
                    onClick={() =>
                      mutate(`/api/trips/${trip.slug}/shopping`, "DELETE", { id: item.id, actorId: me.id }, "Item deleted")
                    }
                  >
                    delete
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {me ? (
        <form onSubmit={submit} className="mt-4 flex gap-2">
          <label className="sr-only" htmlFor="shop-name">Item</label>
          <input
            id="shop-name"
            required
            placeholder="Coffee, sunscreen, burgers…"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`${inputCls} min-w-0 flex-1`}
          />
          <label className="sr-only" htmlFor="shop-qty">Quantity (optional)</label>
          <input
            id="shop-qty"
            placeholder="2 cases"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className={`${inputCls} w-24 shrink-0`}
          />
          <button type="submit" className="btn-teal shrink-0 px-5">Add</button>
        </form>
      ) : (
        <p className="mt-3 text-sm font-semibold text-ink-soft">Join the trip to add to the list.</p>
      )}
    </div>
  );
}

/* ---------------- Weather strip ---------------- */

const WMO_EMOJI: Record<number, string> = {
  0: "☀️", 1: "🌤️", 2: "🌤️", 3: "☁️", 45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌦️", 56: "🌧️", 57: "🌧️",
  61: "🌧️", 63: "🌧️", 65: "🌧️", 66: "🌧️", 67: "🌧️",
  71: "❄️", 73: "❄️", 75: "❄️", 77: "❄️", 85: "❄️", 86: "❄️",
  80: "🌦️", 81: "🌦️", 82: "🌦️", 95: "⛈️", 96: "⛈️", 99: "⛈️",
};

interface WeatherDay {
  date: string;
  code: number;
  hi: number;
  lo: number;
  precip: number | null;
}

function WeatherStrip({ slug }: { slug: string }) {
  const [data, setData] = useState<{
    status: string;
    place?: string;
    days?: WeatherDay[];
    daysUntil?: number;
  } | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/trips/${slug}/weather`)
      .then((r) => r.json())
      .then((d) => live && setData(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [slug]);

  if (!data) return null;
  if (data.status === "too_far") {
    return (
      <p className="mt-4 px-2 text-center text-xs font-bold text-ink-soft">
        🌤️ The forecast for this trip lands about two weeks out — check back as it gets closer.
      </p>
    );
  }
  if (data.status !== "ok" || !data.days?.length) return null;

  return (
    <div className="card mt-5 p-4">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h3 className="font-display text-base font-bold text-teal-dark">Trip forecast</h3>
        {data.place && <span className="truncate text-xs font-bold text-ink-soft">{data.place}</span>}
      </div>
      <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
        {data.days.map((d) => (
          <div
            key={d.date}
            className="flex w-[68px] shrink-0 flex-col items-center rounded-2xl bg-cream-deep/60 px-2 py-2.5 ring-1 ring-cream-edge/50"
          >
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">
              {formatDate(d.date).split(",")[0]}
            </span>
            <span className="my-1 text-2xl leading-none">{WMO_EMOJI[d.code] ?? "🌡️"}</span>
            <span className="font-display text-sm font-bold text-ink">
              {d.hi}° <span className="font-bold text-ink-soft">{d.lo}°</span>
            </span>
            {d.precip !== null && d.precip >= 30 && (
              <span className="mt-0.5 text-[11px] font-extrabold text-teal-dark">💧 {d.precip}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Trip map ---------------- */

interface MapPoint {
  label: string;
  sub?: string;
  lat: number;
  lon: number;
  kind: "event" | "plan";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** One map of the whole trip: event venues (coral) + plan spots (teal).
 *  Renders nothing until there is at least one mappable point. */
function MapSection({ trip }: { trip: Trip }) {
  const [data, setData] = useState<{ center: { lat: number; lon: number } | null; points: MapPoint[] } | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapObj = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/trips/${trip.slug}/map`)
      .then((r) => r.json())
      .then((d) => {
        if (live && d && Array.isArray(d.points)) setData(d);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [trip.slug]);

  useEffect(() => {
    if (!data || data.points.length === 0 || !mapEl.current || mapObj.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current) return;
      const map = L.map(mapEl.current, { scrollWheelZoom: false });
      mapObj.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      const bounds: [number, number][] = [];
      for (const p of data.points) {
        const color = p.kind === "event" ? "#E8503F" : "#0B5563";
        const marker = L.circleMarker([p.lat, p.lon], {
          radius: 9,
          color: "#ffffff",
          weight: 2.5,
          fillColor: color,
          fillOpacity: 0.95,
        }).addTo(map);
        const gmaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.label)}`;
        marker.bindPopup(
          `<div style="font-family:inherit;min-width:150px"><strong>${escapeHtml(p.label)}</strong>` +
            (p.sub ? `<br/><span style="color:#666">${escapeHtml(p.sub)}</span>` : "") +
            `<br/><a href="${gmaps}" target="_blank" rel="noopener noreferrer" style="font-weight:700">Open in Google Maps →</a></div>`
        );
        bounds.push([p.lat, p.lon]);
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [28, 28] });
      else if (bounds.length === 1) map.setView(bounds[0], 13);
      else if (data.center) map.setView([data.center.lat, data.center.lon], 12);
    })();
    return () => {
      cancelled = true;
    };
  }, [data, trip.location]);

  useEffect(
    () => () => {
      mapObj.current?.remove();
      mapObj.current = null;
    },
    []
  );

  if (!data) return null;
  if (data.points.length === 0) return null;

  const planCount = data.points.filter((p) => p.kind === "plan").length;
  const venueCount = data.points.length - planCount;

  return (
    <div className="mt-7">
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal text-white shadow-teal">
          <PinIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-bold leading-tight text-teal-dark">Trip map</h3>
          <p className="text-xs font-semibold text-ink-soft">
            {venueCount > 0 && `${venueCount} event venue${venueCount === 1 ? "" : "s"}`}
            {venueCount > 0 && planCount > 0 && " · "}
            {planCount > 0 && `${planCount} plan spot${planCount === 1 ? "" : "s"}`}
            {" — tap a pin for directions"}
          </p>
        </div>
      </div>
      <div className="card mt-3 overflow-hidden p-1.5">
        <div ref={mapEl} className="z-0 h-[320px] w-full rounded-[20px]" />
        <div className="flex items-center gap-4 px-3 py-2 text-[11px] font-bold text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-coral-dark ring-2 ring-white" /> Event venues
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-deep ring-2 ring-white" /> Plan spots
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Events strip ---------------- */

interface TripEvent {
  id: string;
  name: string;
  date: string;
  time?: string;
  venue?: string;
  lat?: number;
  lon?: number;
  url: string;
  image?: string;
  category?: string;
}

function EventsStrip({ trip, me, mutate }: { trip: Trip; me?: Attendee; mutate: Mutate }) {
  const [events, setEvents] = useState<TripEvent[] | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let live = true;
    fetch(`/api/trips/${trip.slug}/events`)
      .then((r) => r.json())
      .then((d) => {
        if (live && d.enabled && Array.isArray(d.events)) setEvents(d.events);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [trip.slug]);

  if (!events || events.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral text-lg text-white shadow-coral">🎟️</span>
        <div>
          <h3 className="font-display text-xl font-bold leading-tight text-teal-dark">Happening while you&apos;re there</h3>
          <p className="text-xs font-semibold text-ink-soft">Events at the destination on your dates.</p>
        </div>
      </div>
      <div className="mt-3 space-y-2.5">
        {events.slice(0, 8).map((ev) => (
          <article key={ev.id} className="card flex items-center gap-3 p-3.5">
            {ev.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ev.image} alt="" loading="lazy" className="h-14 w-20 shrink-0 rounded-xl object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[15px] font-bold leading-tight text-ink">{ev.name}</div>
              <div className="mt-0.5 truncate text-xs font-bold text-ink-soft">
                {formatDate(ev.date)}
                {ev.time ? ` · ${formatTime(ev.time)}` : ""}
                {ev.venue ? ` · ${ev.venue}` : ""}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <a
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-amber-soft px-2.5 py-1 text-[11px] font-extrabold text-amber-dark ring-1 ring-amber/40 transition hover:ring-amber"
                >
                  Tickets ↗
                </a>
                {me &&
                  (added.has(ev.id) ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-mist px-2.5 py-1 text-[11px] font-extrabold text-teal-dark">
                      <CheckIcon className="h-3 w-3" /> In the plan
                    </span>
                  ) : (
                    <button
                      className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-teal-dark shadow-sm ring-1 ring-cream-edge transition hover:ring-amber"
                      onClick={async () => {
                        await mutate(
                          `/api/trips/${trip.slug}/schedule`,
                          "POST",
                          {
                            actorId: me.id,
                            title: ev.name,
                            date: ev.date,
                            time: ev.time ?? "",
                            location: ev.venue ?? "",
                            notes: `Tickets: ${ev.url}`,
                          },
                          "Added to the plan"
                        );
                        setAdded((s) => new Set(s).add(ev.id));
                      }}
                    >
                      + Add to plan
                    </button>
                  ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Activities strip (Viator affiliate) ---------------- */

interface TripActivity {
  id: string;
  title: string;
  blurb: string;
  meta: string;
  priceNote?: string;
  emoji: string;
  url: string;
}

function ActivitiesStrip({ trip, me, mutate }: { trip: Trip; me?: Attendee; mutate: Mutate }) {
  const [data, setData] = useState<{ city: string; browseUrl: string; activities: TripActivity[] } | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let live = true;
    fetch(`/api/trips/${trip.slug}/activities`)
      .then((r) => r.json())
      .then((d) => {
        if (live && d.enabled && Array.isArray(d.activities) && d.activities.length > 0) setData(d);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [trip.slug]);

  if (!data) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal text-lg text-white shadow-teal">🧭</span>
        <div>
          <h3 className="font-display text-xl font-bold leading-tight text-teal-dark">Things to do in {data.city}</h3>
          <p className="text-xs font-semibold text-ink-soft">Bookable tours &amp; activities, hand-picked for this trip.</p>
        </div>
      </div>
      <div className="mt-3 space-y-2.5">
        {data.activities.map((a) => (
          <article key={a.id} className="card flex items-center gap-3 p-3.5">
            <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-teal-mist text-3xl">{a.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[15px] font-bold leading-tight text-ink">{a.title}</div>
              <p className="mt-0.5 text-xs font-semibold leading-snug text-ink-soft">{a.blurb}</p>
              <div className="mt-0.5 truncate text-xs font-bold text-ink-soft">
                {a.meta}
                {a.priceNote ? ` · ${a.priceNote}` : ""}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <a
                  href={a.url}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="rounded-full bg-amber-soft px-2.5 py-1 text-[11px] font-extrabold text-amber-dark ring-1 ring-amber/40 transition hover:ring-amber"
                >
                  Book on Viator ↗
                </a>
                {me &&
                  (added.has(a.id) ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-mist px-2.5 py-1 text-[11px] font-extrabold text-teal-dark">
                      <CheckIcon className="h-3 w-3" /> In the plan
                    </span>
                  ) : (
                    <button
                      className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-teal-dark shadow-sm ring-1 ring-cream-edge transition hover:ring-amber"
                      onClick={async () => {
                        await mutate(
                          `/api/trips/${trip.slug}/schedule`,
                          "POST",
                          {
                            actorId: me.id,
                            title: a.title,
                            date: trip.startDate,
                            time: "",
                            location: data.city,
                            notes: `Book on Viator: ${a.url}`,
                          },
                          "Added to the plan"
                        );
                        setAdded((s) => new Set(s).add(a.id));
                      }}
                    >
                      + Add to plan
                    </button>
                  ))}
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-2.5 px-1 text-[11px] font-semibold text-ink-soft">
        <a href={data.browseUrl} target="_blank" rel="sponsored noopener noreferrer" className="font-extrabold text-teal-dark underline decoration-amber decoration-2 underline-offset-2">
          Browse everything to do in {data.city} on Viator ↗
        </a>{" "}
        · Booking through these links may earn MyVacaPlanner a commission, at no extra cost to you.
      </p>
    </div>
  );
}

/* ---------------- Polls ---------------- */

function PollsSection({
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
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const polls = trip.polls ?? [];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || opts.length < 2) return;
    await mutate(
      `/api/trips/${trip.slug}/polls`,
      "POST",
      { actorId: me!.id, question: question.trim(), options: opts },
      "Poll posted"
    );
    setQuestion("");
    setOptions(["", ""]);
  }

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal text-lg text-white shadow-teal">🗳️</span>
        <div>
          <h3 className="font-display text-xl font-bold leading-tight text-teal-dark">Crew decisions</h3>
          <p className="text-xs font-semibold text-ink-soft">Put it to a vote instead of a 200-message thread.</p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {polls.map((poll: Poll) => {
          const total = poll.options.reduce((n, o) => n + o.votes.length, 0);
          const myVote = me ? poll.options.find((o) => o.votes.includes(me.id))?.id : undefined;
          const canManage = me && (me.isOrganizer || poll.createdBy === me.id);
          return (
            <article key={poll.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <h4 className="min-w-0 font-display text-[16px] font-bold leading-snug text-ink">{poll.question}</h4>
                {poll.closed && (
                  <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-600">
                    closed
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs font-semibold text-ink-soft">
                Asked by {nameOf(poll.createdBy).split(" ")[0]} · {total} vote{total === 1 ? "" : "s"}
                {myVote && !poll.closed ? " · tap your pick again to take it back" : ""}
              </p>
              <div className="mt-3 space-y-2">
                {poll.options.map((opt) => {
                  const pct = total > 0 ? Math.round((opt.votes.length / total) * 100) : 0;
                  const mine = myVote === opt.id;
                  return (
                    <button
                      key={opt.id}
                      disabled={!me || poll.closed}
                      onClick={() =>
                        mutate(
                          `/api/trips/${trip.slug}/polls`,
                          "PATCH",
                          { id: poll.id, actorId: me!.id, optionId: opt.id },
                          mine ? "Vote removed" : "Vote counted 🗳️"
                        )
                      }
                      className={`relative block w-full overflow-hidden rounded-2xl px-3.5 py-2.5 text-left ring-2 transition ${
                        mine
                          ? "bg-teal-mist/60 ring-teal"
                          : "bg-cream-deep/50 ring-cream-edge/60 hover:ring-amber disabled:hover:ring-cream-edge/60"
                      }`}
                    >
                      <span
                        className={`absolute inset-y-0 left-0 ${mine ? "bg-teal/25" : "bg-teal/10"}`}
                        style={{ width: `${pct}%` }}
                      />
                      <span className="relative flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 font-display text-sm font-bold text-ink">
                          <span className="truncate">{opt.text}</span>
                          {mine && <CheckIcon className="h-4 w-4 shrink-0 text-teal-dark" />}
                        </span>
                        <span className="shrink-0 text-xs font-extrabold text-ink-soft">
                          {opt.votes.length} · {pct}%
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {canManage && (
                <div className="mt-3 flex gap-3 text-[11px] font-extrabold">
                  <button
                    className="text-teal-dark underline decoration-amber decoration-2 underline-offset-2"
                    onClick={() =>
                      mutate(
                        `/api/trips/${trip.slug}/polls`,
                        "PATCH",
                        { id: poll.id, actorId: me!.id, closed: !poll.closed },
                        poll.closed ? "Poll reopened" : "Poll closed"
                      )
                    }
                  >
                    {poll.closed ? "reopen" : "close poll"}
                  </button>
                  <button
                    className="text-coral-dark underline decoration-coral/50 underline-offset-2"
                    onClick={() =>
                      mutate(`/api/trips/${trip.slug}/polls`, "DELETE", { id: poll.id, actorId: me!.id }, "Poll deleted")
                    }
                  >
                    delete
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {me ? (
        <form onSubmit={create} className="card mt-3 p-4">
          <label className={labelCls} htmlFor="poll-q">Ask the crew something</label>
          <input
            id="poll-q"
            placeholder="Beach day or golf on Saturday?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className={inputCls}
          />
          <div className="mt-2.5 space-y-2">
            {options.map((opt, i) => (
              <input
                key={i}
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
                className={inputCls}
              />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" className="btn-teal flex-1 py-2.5" disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}>
              Post poll
            </button>
            {options.length < 6 && (
              <button type="button" className="btn-ghost px-4" onClick={() => setOptions([...options, ""])}>
                + option
              </button>
            )}
          </div>
        </form>
      ) : (
        polls.length === 0 && (
          <p className="mt-3 px-2 text-sm font-semibold text-ink-soft">Join the trip to post the first poll.</p>
        )
      )}
    </div>
  );
}

/* ---------------- Packing / to-bring list ---------------- */

function PackingSection({
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
  const [form, setForm] = useState({ name: "", quantity: "", mine: true });
  const items = useMemo(() => {
    const list = [...(trip.packing ?? [])];
    list.sort((a, b) => Number(a.checked) - Number(b.checked) || a.createdAt - b.createdAt);
    return list;
  }, [trip.packing]);
  const packed = items.filter((i) => i.checked).length;
  const firstName = (id: string) => nameOf(id).split(" ")[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await mutate(
      `/api/trips/${trip.slug}/packing`,
      "POST",
      {
        actorId: me!.id,
        name: form.name,
        quantity: form.quantity || undefined,
        assignedTo: form.mine ? me!.id : undefined,
      },
      "Added to the to-bring list"
    );
    setForm({ name: "", quantity: "", mine: true });
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-teal-dark">🎒 To bring</h3>
        {items.length > 0 && (
          <span className="shrink-0 rounded-full bg-amber-soft px-3 py-1 font-display text-sm font-bold text-amber-dark">
            {packed} of {items.length} packed
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm font-medium text-ink-soft">Who&apos;s bringing what, so three people don&apos;t pack the same cooler.</p>

      {items.length === 0 ? (
        <div className="mt-3 rounded-2xl border-2 border-dashed border-cream-edge bg-cream/60 px-4 py-3.5 text-sm font-semibold text-ink-soft">
          Nothing here yet — add the stuff the group needs someone to bring.
        </div>
      ) : (
        <ul className="mt-1 divide-y divide-cream-edge/70">
          {items.map((item: PackingItem) => {
            const meta: string[] = [];
            if (item.quantity) meta.push(item.quantity);
            if (item.note) meta.push(item.note);
            meta.push(`added by ${firstName(item.createdBy)}`);
            if (item.checked && item.checkedBy) meta.push(`packed by ${firstName(item.checkedBy)}`);
            const claimedByMe = me && item.assignedTo === me.id;
            return (
              <li key={item.id} className="py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!me}
                    aria-label={item.checked ? "Mark as not packed" : "Mark as packed"}
                    onClick={() =>
                      mutate(
                        `/api/trips/${trip.slug}/packing`,
                        "PATCH",
                        { id: item.id, actorId: me!.id, checked: !item.checked },
                        item.checked ? "Back on the list" : "Packed ✓"
                      )
                    }
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-2 transition ${
                      item.checked
                        ? "bg-teal text-white ring-teal"
                        : "bg-white ring-cream-edge hover:ring-amber disabled:hover:ring-cream-edge"
                    }`}
                  >
                    {item.checked && <CheckIcon className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate font-display text-[15px] font-bold ${
                        item.checked ? "text-ink-soft line-through" : "text-ink"
                      }`}
                    >
                      {item.name}
                    </div>
                    <div className="truncate text-xs font-semibold text-ink-soft">{meta.join(" · ")}</div>
                  </div>
                  {me && (me.isOrganizer || item.createdBy === me.id) && (
                    <button
                      className="shrink-0 text-xs font-extrabold text-coral-dark underline decoration-coral/50 underline-offset-2"
                      onClick={() =>
                        mutate(`/api/trips/${trip.slug}/packing`, "DELETE", { id: item.id, actorId: me.id }, "Item deleted")
                      }
                    >
                      delete
                    </button>
                  )}
                </div>
                <div className="ml-9 mt-1.5">
                  {item.assignedTo ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-dark">
                      <Avatar name={nameOf(item.assignedTo)} size="sm" />
                      {claimedByMe ? "You're bringing this" : `${firstName(item.assignedTo)} is bringing this`}
                      {claimedByMe && (
                        <button
                          className="font-extrabold text-ink-soft underline decoration-amber decoration-2 underline-offset-2"
                          onClick={() =>
                            mutate(
                              `/api/trips/${trip.slug}/packing`,
                              "PATCH",
                              { id: item.id, actorId: me.id, assignedTo: null },
                              "Released"
                            )
                          }
                        >
                          release
                        </button>
                      )}
                    </span>
                  ) : me ? (
                    <button
                      className="rounded-full bg-cream-deep px-3 py-1 text-xs font-extrabold text-teal-dark ring-1 ring-cream-edge transition hover:ring-amber"
                      onClick={() =>
                        mutate(
                          `/api/trips/${trip.slug}/packing`,
                          "PATCH",
                          { id: item.id, actorId: me.id, assignedTo: me.id },
                          "You've got it 🎒"
                        )
                      }
                    >
                      I&apos;ll bring it
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-ink-soft">Unclaimed</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {me ? (
        <form onSubmit={submit} className="mt-4">
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="pack-name">Item</label>
            <input
              id="pack-name"
              required
              placeholder="Cooler, speaker, cards…"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`${inputCls} min-w-0 flex-1`}
            />
            <label className="sr-only" htmlFor="pack-qty">Quantity (optional)</label>
            <input
              id="pack-qty"
              placeholder="Qty"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className={`${inputCls} w-20 shrink-0`}
            />
            <button type="submit" className="btn-teal shrink-0 px-5">Add</button>
          </div>
          <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-soft">
            <input
              type="checkbox"
              checked={form.mine}
              onChange={(e) => setForm({ ...form, mine: e.target.checked })}
              className="h-4 w-4 accent-[#0E7490]"
            />
            I&apos;ll bring it myself
          </label>
        </form>
      ) : (
        <p className="mt-3 text-sm font-semibold text-ink-soft">Join the trip to claim something to bring.</p>
      )}
    </div>
  );
}
