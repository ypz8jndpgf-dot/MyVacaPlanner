import { NextResponse } from "next/server";
import { isOrganizerId } from "@/lib/logic";
import { newId, updateDB } from "@/lib/store";
import type { ScheduleItem, Trip } from "@/lib/types";

export const dynamic = "force-dynamic";

function canModify(
  trip: { attendees: { id: string; isOrganizer: boolean }[] },
  item: ScheduleItem,
  actorId: string
): boolean {
  const actor = trip.attendees.find((a) => a.id === actorId);
  return Boolean(actor && (actor.isOrganizer || item.createdBy === actorId));
}

/**
 * Organizer Pass itinerary lock: exists only on pass trips (the flag
 * that sets it lives behind the pass gate). While locked, schedule
 * changes are organizer-only — co-organizers included. Unlocked and
 * free trips behave exactly as before.
 */
function lockedForNonOrganizer(trip: Trip, actorId: string): boolean {
  return Boolean(trip.pass && trip.itineraryLocked && !isOrganizerId(trip, actorId));
}

/** Add a schedule item. Any attendee. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    actorId?: string;
    title?: string;
    date?: string;
    time?: string;
    location?: string;
    notes?: string;
  } | null;
  if (!body?.actorId || !body.title?.trim() || !body.date)
    return NextResponse.json({ error: "actorId, title and date are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    if (!trip.attendees.some((a) => a.id === body.actorId)) return "forbidden" as const;
    if (lockedForNonOrganizer(trip, body.actorId!)) return "locked" as const;
    const item: ScheduleItem = {
      id: newId("sch"),
      title: body.title!.trim(),
      date: body.date!,
      time: body.time?.trim() || undefined,
      location: body.location?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
      createdBy: body.actorId!,
      createdAt: Date.now(),
    };
    trip.schedule.push(item);
    return { item, trip };
  });

  if (!result) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Join the trip first" }, { status: 403 });
  if (result === "locked")
    return NextResponse.json(
      { error: "The itinerary is locked — only organizers can change the plan" },
      { status: 403 }
    );
  return NextResponse.json(result, { status: 201 });
}

/** Edit a schedule item. Creator or organizer. */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    actorId?: string;
    title?: string;
    date?: string;
    time?: string;
    location?: string;
    notes?: string;
  } | null;
  if (!body?.id || !body.actorId)
    return NextResponse.json({ error: "id and actorId are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    const item = trip.schedule.find((s) => s.id === body.id);
    if (!item) return null;
    if (trip.pass && trip.itineraryLocked) {
      if (!isOrganizerId(trip, body.actorId!)) return "locked" as const;
    } else if (!canModify(trip, item, body.actorId!)) return "forbidden" as const;
    if (body.title?.trim()) item.title = body.title.trim();
    if (body.date) item.date = body.date;
    if (body.time !== undefined) item.time = body.time.trim() || undefined;
    if (body.location !== undefined) item.location = body.location.trim() || undefined;
    if (body.notes !== undefined) item.notes = body.notes.trim() || undefined;
    return { trip };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  if (result === "locked")
    return NextResponse.json(
      { error: "The itinerary is locked — only organizers can change the plan" },
      { status: 403 }
    );
  return NextResponse.json(result);
}

/** Delete a schedule item. Creator or organizer. */
export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as { id?: string; actorId?: string } | null;
  if (!body?.id || !body.actorId)
    return NextResponse.json({ error: "id and actorId are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    const item = trip.schedule.find((s) => s.id === body.id);
    if (!item) return null;
    if (trip.pass && trip.itineraryLocked) {
      if (!isOrganizerId(trip, body.actorId!)) return "locked" as const;
    } else if (!canModify(trip, item, body.actorId!)) return "forbidden" as const;
    trip.schedule = trip.schedule.filter((s) => s.id !== body.id);
    return { trip };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  if (result === "locked")
    return NextResponse.json(
      { error: "The itinerary is locked — only organizers can change the plan" },
      { status: 403 }
    );
  return NextResponse.json(result);
}
