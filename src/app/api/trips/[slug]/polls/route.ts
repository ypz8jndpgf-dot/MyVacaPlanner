import { NextResponse } from "next/server";
import { newId, updateDB } from "@/lib/store";
import type { Poll } from "@/lib/types";

export const dynamic = "force-dynamic";

function canModify(
  trip: { attendees: { id: string; isOrganizer: boolean }[] },
  poll: Poll,
  actorId: string
): boolean {
  const actor = trip.attendees.find((a) => a.id === actorId);
  return Boolean(actor && (actor.isOrganizer || poll.createdBy === actorId));
}

/** Create a poll. Any attendee. 2–6 text options. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    actorId?: string;
    question?: string;
    options?: string[];
  } | null;
  const options = (body?.options ?? []).map((o) => o?.trim()).filter(Boolean) as string[];
  if (!body?.actorId || !body.question?.trim() || options.length < 2)
    return NextResponse.json(
      { error: "actorId, a question and at least 2 options are required" },
      { status: 400 }
    );
  if (options.length > 6)
    return NextResponse.json({ error: "At most 6 options per poll" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    if (!trip.attendees.some((a) => a.id === body.actorId)) return "forbidden" as const;
    if (!Array.isArray(trip.polls)) trip.polls = [];
    const poll: Poll = {
      id: newId("pol"),
      question: body.question!.trim(),
      options: options.map((text) => ({ id: newId("opt"), text, votes: [] })),
      closed: false,
      createdBy: body.actorId!,
      createdAt: Date.now(),
    };
    trip.polls.push(poll);
    return { poll, trip };
  });

  if (!result) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Join the trip first" }, { status: 403 });
  return NextResponse.json(result, { status: 201 });
}

/**
 * Vote or manage a poll.
 * - { optionId } casts/moves the actor's single vote (voting the same option
 *   again retracts it). Blocked while the poll is closed.
 * - { closed: boolean } closes/reopens — creator or organizer only.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    actorId?: string;
    optionId?: string;
    closed?: boolean;
  } | null;
  if (!body?.id || !body.actorId)
    return NextResponse.json({ error: "id and actorId are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    if (!Array.isArray(trip.polls)) trip.polls = [];
    const poll = trip.polls.find((p) => p.id === body.id);
    if (!poll) return null;
    if (!trip.attendees.some((a) => a.id === body.actorId)) return "forbidden" as const;

    if (body.closed !== undefined) {
      if (!canModify(trip, poll, body.actorId!)) return "forbidden" as const;
      poll.closed = body.closed;
      return { trip };
    }

    if (body.optionId) {
      if (poll.closed) return "closed" as const;
      const target = poll.options.find((o) => o.id === body.optionId);
      if (!target) return null;
      const alreadyMine = target.votes.includes(body.actorId!);
      for (const opt of poll.options) opt.votes = opt.votes.filter((v) => v !== body.actorId);
      if (!alreadyMine) target.votes.push(body.actorId!);
      return { trip };
    }

    return null;
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  if (result === "closed") return NextResponse.json({ error: "This poll is closed" }, { status: 409 });
  return NextResponse.json(result);
}

/** Delete a poll. Creator or organizer. */
export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as { id?: string; actorId?: string } | null;
  if (!body?.id || !body.actorId)
    return NextResponse.json({ error: "id and actorId are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    if (!Array.isArray(trip.polls)) trip.polls = [];
    const poll = trip.polls.find((p) => p.id === body.id);
    if (!poll) return null;
    if (!canModify(trip, poll, body.actorId!)) return "forbidden" as const;
    trip.polls = trip.polls.filter((p) => p.id !== body.id);
    return { trip };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json(result);
}
