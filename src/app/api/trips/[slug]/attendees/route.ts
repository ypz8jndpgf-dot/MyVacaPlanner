import { NextResponse } from "next/server";
import { newId, updateDB } from "@/lib/store";
import type { Attendee, Rsvp } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Join a trip with a display name (the link is the key). */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as { name?: string; rsvp?: Rsvp } | null;
  if (!body?.name?.trim())
    return NextResponse.json({ error: "name is required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    // Re-joining with the same name returns the existing attendee (phone switching, link re-taps).
    const existing = trip.attendees.find(
      (a) => a.name.trim().toLowerCase() === body.name!.trim().toLowerCase()
    );
    if (existing) {
      if (body.rsvp) existing.rsvp = body.rsvp;
      return { attendee: existing, trip };
    }
    const attendee: Attendee = {
      id: newId("att"),
      name: body.name!.trim(),
      rsvp: body.rsvp ?? "in",
      isOrganizer: false,
      createdAt: Date.now(),
    };
    trip.attendees.push(attendee);
    return { attendee, trip };
  });

  if (!result) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(result, { status: 201 });
}

/** Change RSVP / rename. Self or organizer. */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    actorId?: string;
    rsvp?: Rsvp;
    name?: string;
  } | null;
  if (!body?.id || !body.actorId)
    return NextResponse.json({ error: "id and actorId are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    const actor = trip.attendees.find((a) => a.id === body.actorId);
    if (!actor) return "forbidden" as const;
    if (body.actorId !== body.id && !actor.isOrganizer) return "forbidden" as const;
    const target = trip.attendees.find((a) => a.id === body.id);
    if (!target) return null;
    if (body.rsvp) target.rsvp = body.rsvp;
    if (body.name?.trim()) target.name = body.name.trim();
    return { trip };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json(result);
}

/** Remove an attendee. Organizer only. */
export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as { id?: string; actorId?: string } | null;
  if (!body?.id || !body.actorId)
    return NextResponse.json({ error: "id and actorId are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    const actor = trip.attendees.find((a) => a.id === body.actorId);
    if (!actor?.isOrganizer) return "forbidden" as const;
    const target = trip.attendees.find((a) => a.id === body.id);
    if (target?.isOrganizer) return "forbidden" as const;
    trip.attendees = trip.attendees.filter((a) => a.id !== body.id);
    return { trip };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json(result);
}
