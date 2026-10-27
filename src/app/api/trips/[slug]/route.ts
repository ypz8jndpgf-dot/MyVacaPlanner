import { NextResponse } from "next/server";
import { getTrip, updateDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getTrip(slug);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json({ trip });
}

/** Organizer-only trip detail edits. */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    actorId?: string;
    name?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
  } | null;
  if (!body?.actorId) return NextResponse.json({ error: "actorId required" }, { status: 400 });

  const updated = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    const actor = trip.attendees.find((a) => a.id === body.actorId);
    if (!actor?.isOrganizer) return "forbidden" as const;
    if (body.name?.trim()) trip.name = body.name.trim();
    if (body.location !== undefined) trip.location = body.location.trim();
    if (body.startDate) trip.startDate = body.startDate;
    if (body.endDate) trip.endDate = body.endDate;
    return trip;
  });

  if (!updated) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (updated === "forbidden")
    return NextResponse.json({ error: "Only the organizer can edit trip details" }, { status: 403 });
  return NextResponse.json({ trip: updated });
}
