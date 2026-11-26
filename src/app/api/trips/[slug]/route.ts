import { NextResponse } from "next/server";
import { getSessionEmail, organizerGate, VERIFY_MSG } from "@/lib/auth";
import { getTrip, updateDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getTrip(slug);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  // The Stripe session id on a pass record is a payment internal — it
  // never leaves the server. Trips without a pass are returned exactly
  // as stored (byte-for-byte the pre-pass response).
  if (trip.pass) {
    const publicPass = { purchasedAt: trip.pass.purchasedAt, byName: trip.pass.byName };
    return NextResponse.json({ trip: { ...trip, pass: publicPass } });
  }
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
  const session = await getSessionEmail();

  // Destination and dates stay mandatory on edit too — they can't be blanked.
  if (body.location !== undefined && !body.location.trim())
    return NextResponse.json({ error: "Destination can't be blank" }, { status: 400 });
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (
    (body.startDate && !DATE_RE.test(body.startDate)) ||
    (body.endDate && !DATE_RE.test(body.endDate))
  )
    return NextResponse.json({ error: "Dates must be YYYY-MM-DD" }, { status: 400 });

  const updated = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    const gate = organizerGate(trip, body.actorId, session);
    if (gate === "verify") return "verify" as const;
    if (gate) return "forbidden" as const;
    const nextStart = body.startDate ?? trip.startDate;
    const nextEnd = body.endDate ?? trip.endDate;
    if (nextEnd < nextStart) return "bad_dates" as const;
    if (body.name?.trim()) trip.name = body.name.trim();
    if (body.location !== undefined) trip.location = body.location.trim();
    if (body.startDate) trip.startDate = body.startDate;
    if (body.endDate) trip.endDate = body.endDate;
    return trip;
  });

  if (!updated) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (updated === "forbidden")
    return NextResponse.json({ error: "Only the organizer can edit trip details" }, { status: 403 });
  if (updated === "verify")
    return NextResponse.json({ error: VERIFY_MSG, code: "VERIFY_REQUIRED" }, { status: 403 });
  if (updated === "bad_dates")
    return NextResponse.json({ error: "End date must be on or after start date" }, { status: 400 });
  return NextResponse.json({ trip: updated });
}
