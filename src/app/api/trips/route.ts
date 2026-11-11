import { NextResponse } from "next/server";
import { loadDB, makeSlug, newId, updateDB } from "@/lib/store";
import type { Trip } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Merged-duplicate stubs (name contains "MERGED", e.g. "… — MERGED into
 * Rocky Run") are merge debris: their contents live in the canonical trip.
 * They are hidden from the homepage board so browsing crews don't land in a
 * stale copy — but NOT deleted, because old invite links are still in
 * circulation; the stub stays reachable by direct link, and its own name
 * (rendered as the trip page header) tells visitors it was merged.
 */
function isMergedStub(t: Trip): boolean {
  return /merged/i.test(t.name);
}

/** List trips (summary only) for the public homepage board. */
export async function GET() {
  const db = await loadDB();
  return NextResponse.json({
    trips: db.trips
      .filter((t) => !isMergedStub(t))
      .map((t) => ({
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
  // Destination ("endpoint") and both dates are mandatory (user directive
  // 2026-11-10): a trip without a place has no weather, events, activities
  // or map — the whole Rocky Run standard keys off them.
  if (
    !body?.name?.trim() ||
    !body.location?.trim() ||
    !body.startDate ||
    !body.endDate ||
    !body.organizerName?.trim()
  ) {
    return NextResponse.json(
      { error: "name, destination, startDate, endDate and organizerName are required" },
      { status: 400 }
    );
  }
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE_RE.test(body.startDate) || !DATE_RE.test(body.endDate)) {
    return NextResponse.json({ error: "startDate and endDate must be YYYY-MM-DD" }, { status: 400 });
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
      location: body.location!.trim(),
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
      shopping: [],
      polls: [],
      packing: [],
    };
    db.trips.push(trip);
    return { slug, organizerId };
  });

  return NextResponse.json(result, { status: 201 });
}
