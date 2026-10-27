import { NextResponse } from "next/server";
import { loadDB, makeSlug, newId, updateDB } from "@/lib/store";
import type { Trip } from "@/lib/types";

export const dynamic = "force-dynamic";

/** List trips (summary only). */
export async function GET() {
  const db = await loadDB();
  return NextResponse.json({
    trips: db.trips.map((t) => ({
      slug: t.slug,
      name: t.name,
      location: t.location,
      startDate: t.startDate,
      endDate: t.endDate,
      attendeeCount: t.attendees.filter((a) => a.rsvp === "in").length,
    })),
  });
}

/** Create a trip + its organizer attendee. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    organizerName?: string;
  } | null;
  if (!body?.name?.trim() || !body.startDate || !body.endDate || !body.organizerName?.trim()) {
    return NextResponse.json(
      { error: "name, startDate, endDate and organizerName are required" },
      { status: 400 }
    );
  }
  if (body.endDate < body.startDate) {
    return NextResponse.json({ error: "endDate must be on or after startDate" }, { status: 400 });
  }

  const result = await updateDB((db) => {
    let slug = makeSlug();
    while (db.trips.some((t) => t.slug === slug)) slug = makeSlug();
    const organizerId = newId("att");
    const trip: Trip = {
      slug,
      name: body.name!.trim(),
      location: (body.location ?? "").trim(),
      startDate: body.startDate!,
      endDate: body.endDate!,
      createdAt: Date.now(),
      attendees: [
        {
          id: organizerId,
          name: body.organizerName!.trim(),
          rsvp: "in",
          isOrganizer: true,
          createdAt: Date.now(),
        },
      ],
      schedule: [],
      flights: [],
      expenses: [],
      payments: [],
    };
    db.trips.push(trip);
    return { slug, organizerId };
  });

  return NextResponse.json(result, { status: 201 });
}
