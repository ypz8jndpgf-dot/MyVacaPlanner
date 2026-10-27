import { NextResponse } from "next/server";
import { newId, updateDB } from "@/lib/store";
import type { Flight, FlightDirection } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Who may create/modify a flight: the attendee themselves, or the organizer (on someone's behalf). */
function canTouch(
  trip: { attendees: { id: string; isOrganizer: boolean }[] },
  actorId: string,
  attendeeId: string
): boolean {
  const actor = trip.attendees.find((a) => a.id === actorId);
  return Boolean(actor && (actor.isOrganizer || actorId === attendeeId));
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    actorId?: string;
    attendeeId?: string;
    direction?: FlightDirection;
    airline?: string;
    flightNumber?: string;
    date?: string;
    departTime?: string;
    arriveTime?: string;
    fromAirport?: string;
    toAirport?: string;
  } | null;
  if (
    !body?.actorId ||
    !body.attendeeId ||
    !body.airline?.trim() ||
    !body.date ||
    !body.departTime ||
    !body.arriveTime ||
    !body.fromAirport?.trim() ||
    !body.toAirport?.trim()
  ) {
    return NextResponse.json(
      { error: "actorId, attendeeId, airline, date, departTime, arriveTime, fromAirport, toAirport are required" },
      { status: 400 }
    );
  }

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    if (!trip.attendees.some((a) => a.id === body.attendeeId)) return null;
    if (!canTouch(trip, body.actorId!, body.attendeeId!)) return "forbidden" as const;
    const flight: Flight = {
      id: newId("flt"),
      attendeeId: body.attendeeId!,
      direction: body.direction === "outbound" ? "outbound" : "inbound",
      airline: body.airline!.trim(),
      flightNumber: (body.flightNumber ?? "").trim(),
      date: body.date!,
      departTime: body.departTime!,
      arriveTime: body.arriveTime!,
      fromAirport: body.fromAirport!.trim().toUpperCase(),
      toAirport: body.toAirport!.trim().toUpperCase(),
      createdBy: body.actorId!,
      createdAt: Date.now(),
    };
    trip.flights.push(flight);
    return { flight, trip };
  });

  if (!result) return NextResponse.json({ error: "Trip or attendee not found" }, { status: 404 });
  if (result === "forbidden")
    return NextResponse.json(
      { error: "You can only add flights for yourself (organizers can add for anyone)" },
      { status: 403 }
    );
  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    actorId?: string;
    attendeeId?: string;
    direction?: FlightDirection;
    airline?: string;
    flightNumber?: string;
    date?: string;
    departTime?: string;
    arriveTime?: string;
    fromAirport?: string;
    toAirport?: string;
  } | null;
  if (!body?.id || !body.actorId)
    return NextResponse.json({ error: "id and actorId are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    const flight = trip.flights.find((f) => f.id === body.id);
    if (!flight) return null;
    const targetAttendee = body.attendeeId ?? flight.attendeeId;
    if (!canTouch(trip, body.actorId!, flight.attendeeId) && !canTouch(trip, body.actorId!, targetAttendee))
      return "forbidden" as const;
    if (body.attendeeId && trip.attendees.some((a) => a.id === body.attendeeId))
      flight.attendeeId = body.attendeeId;
    if (body.direction) flight.direction = body.direction;
    if (body.airline?.trim()) flight.airline = body.airline.trim();
    if (body.flightNumber !== undefined) flight.flightNumber = body.flightNumber.trim();
    if (body.date) flight.date = body.date;
    if (body.departTime) flight.departTime = body.departTime;
    if (body.arriveTime) flight.arriveTime = body.arriveTime;
    if (body.fromAirport?.trim()) flight.fromAirport = body.fromAirport.trim().toUpperCase();
    if (body.toAirport?.trim()) flight.toAirport = body.toAirport.trim().toUpperCase();
    return { trip };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json(result);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as { id?: string; actorId?: string } | null;
  if (!body?.id || !body.actorId)
    return NextResponse.json({ error: "id and actorId are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    const flight = trip.flights.find((f) => f.id === body.id);
    if (!flight) return null;
    if (!canTouch(trip, body.actorId!, flight.attendeeId)) return "forbidden" as const;
    trip.flights = trip.flights.filter((f) => f.id !== body.id);
    return { trip };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json(result);
}
