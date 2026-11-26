import { NextResponse } from "next/server";
import { isOrganizerId } from "@/lib/logic";
import { passGate } from "@/lib/pass";
import { updateDB } from "@/lib/store";
import type { SharePayment, SharePaymentMethod, Trip } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Organizer Pass feature actions (paid-up tracking, group fund,
 * announcement, itinerary lock, co-organizers).
 *
 * Every action is gated twice: the pass must be switched on
 * (MVP_PASS_ENABLED) AND the trip must actually have a pass — both
 * enforced here, server-side, no matter what the client renders.
 * Within that, money marks can be made by an organizer or by the
 * person whose share it is; fund/announcement/lock/organizer changes
 * are organizer-only. Identity is the usual per-device attendee id.
 */

const METHODS: SharePaymentMethod[] = ["venmo", "cashapp", "card", "cash"];

type Body = {
  actorId?: string;
  action?: string;
  expenseId?: string;
  attendeeId?: string;
  method?: string;
  txnRef?: string;
  label?: string;
  perPersonCents?: number;
  text?: string;
  locked?: boolean;
  organizerIds?: string[];
};

type PassResult =
  | { kind: "ok"; trip: Trip }
  | { kind: "gate"; status: number; error: string }
  | { kind: "forbidden" }
  | { kind: "bad" }
  | { kind: "notfound" };

const FORBIDDEN: PassResult = { kind: "forbidden" };
const BAD: PassResult = { kind: "bad" };
const NOTFOUND: PassResult = { kind: "notfound" };

function makeMark(body: Body): SharePayment | null {
  if (!METHODS.includes(body.method as SharePaymentMethod)) return null;
  return {
    paidAt: Date.now(),
    method: body.method as SharePaymentMethod,
    ...(body.txnRef?.trim() ? { txnRef: body.txnRef.trim().slice(0, 80) } : {}),
  };
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.actorId || !body.action)
    return NextResponse.json({ error: "actorId and action are required" }, { status: 400 });

  const result: PassResult = await updateDB((db): PassResult => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return NOTFOUND;

    const gate = passGate(trip);
    if (gate) return { kind: "gate", status: gate.status, error: gate.error };

    const actor = trip.attendees.find((a) => a.id === body.actorId);
    if (!actor) return FORBIDDEN;
    const organizer = isOrganizerId(trip, body.actorId);
    const attendeeIds = new Set(trip.attendees.map((a) => a.id));

    /** Organizer-or-self check for money marks. */
    const canMarkFor = (targetId?: string) =>
      Boolean(targetId) && attendeeIds.has(targetId!) && (organizer || body.actorId === targetId);

    switch (body.action) {
      case "mark-share": {
        const expense = trip.expenses.find((e) => e.id === body.expenseId);
        if (!expense) return NOTFOUND;
        if (!expense.splitAmong.includes(body.attendeeId ?? "")) return BAD;
        if (!canMarkFor(body.attendeeId)) return FORBIDDEN;
        const mark = makeMark(body);
        if (!mark) return BAD;
        expense.payments = { ...(expense.payments ?? {}), [body.attendeeId!]: mark };
        return { kind: "ok", trip };
      }
      case "unmark-share": {
        const expense = trip.expenses.find((e) => e.id === body.expenseId);
        if (!expense) return NOTFOUND;
        if (!canMarkFor(body.attendeeId)) return FORBIDDEN;
        if (expense.payments) {
          const next = { ...expense.payments };
          delete next[body.attendeeId!];
          expense.payments = next;
        }
        return { kind: "ok", trip };
      }
      case "set-fund": {
        if (!organizer) return FORBIDDEN;
        const label = body.label?.trim();
        if (
          !label ||
          typeof body.perPersonCents !== "number" ||
          !Number.isInteger(body.perPersonCents) ||
          body.perPersonCents <= 0
        )
          return BAD;
        trip.fund = { label: label.slice(0, 60), perPersonCents: body.perPersonCents };
        return { kind: "ok", trip };
      }
      case "clear-fund": {
        if (!organizer) return FORBIDDEN;
        delete trip.fund;
        trip.fundPayments = {};
        return { kind: "ok", trip };
      }
      case "mark-fund": {
        if (!trip.fund) return BAD;
        if (!canMarkFor(body.attendeeId)) return FORBIDDEN;
        const mark = makeMark(body);
        if (!mark) return BAD;
        trip.fundPayments = { ...(trip.fundPayments ?? {}), [body.attendeeId!]: mark };
        return { kind: "ok", trip };
      }
      case "unmark-fund": {
        if (!canMarkFor(body.attendeeId)) return FORBIDDEN;
        if (trip.fundPayments) {
          const next = { ...trip.fundPayments };
          delete next[body.attendeeId!];
          trip.fundPayments = next;
        }
        return { kind: "ok", trip };
      }
      case "set-announcement": {
        if (!organizer) return FORBIDDEN;
        const text = body.text?.trim();
        if (!text) return BAD;
        trip.announcement = { text: text.slice(0, 280), byName: actor.name, at: Date.now() };
        return { kind: "ok", trip };
      }
      case "clear-announcement": {
        if (!organizer) return FORBIDDEN;
        delete trip.announcement;
        return { kind: "ok", trip };
      }
      case "set-lock": {
        if (!organizer) return FORBIDDEN;
        if (typeof body.locked !== "boolean") return BAD;
        trip.itineraryLocked = body.locked;
        return { kind: "ok", trip };
      }
      case "set-organizers": {
        if (!organizer) return FORBIDDEN;
        if (!Array.isArray(body.organizerIds)) return BAD;
        const primary = trip.attendees.find((a) => a.isOrganizer)?.id;
        const chosen = [...new Set(body.organizerIds)].filter((id) => attendeeIds.has(id));
        // The creator always stays an organizer; order: primary first.
        const next = [
          ...(primary ? [primary] : []),
          ...chosen.filter((id) => id !== primary),
        ];
        if (next.length === 0) return BAD;
        trip.organizers = next;
        return { kind: "ok", trip };
      }
      default:
        return BAD;
    }
  });

  switch (result.kind) {
    case "notfound":
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    case "gate":
      return NextResponse.json({ error: result.error }, { status: result.status });
    case "forbidden":
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    case "bad":
      return NextResponse.json({ error: "Invalid pass action" }, { status: 400 });
    case "ok":
      return NextResponse.json({ trip: result.trip });
  }
}
