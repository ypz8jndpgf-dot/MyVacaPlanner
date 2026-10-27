import { NextResponse } from "next/server";
import { newId, updateDB } from "@/lib/store";
import type { Payment } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Record a settle-up payment ("mark as paid"). Any attendee can record one. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    actorId?: string;
    fromId?: string;
    toId?: string;
    amountCents?: number;
  } | null;
  if (
    !body?.actorId ||
    !body.fromId ||
    !body.toId ||
    body.fromId === body.toId ||
    typeof body.amountCents !== "number" ||
    !Number.isInteger(body.amountCents) ||
    body.amountCents <= 0
  ) {
    return NextResponse.json(
      { error: "actorId, fromId, toId and a positive integer amountCents are required" },
      { status: 400 }
    );
  }

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    const ids = new Set(trip.attendees.map((a) => a.id));
    if (!ids.has(body.actorId!) || !ids.has(body.fromId!) || !ids.has(body.toId!))
      return "forbidden" as const;
    const payment: Payment = {
      id: newId("pay"),
      fromId: body.fromId!,
      toId: body.toId!,
      amountCents: body.amountCents!,
      createdAt: Date.now(),
    };
    trip.payments.push(payment);
    return { payment, trip };
  });

  if (!result) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (result === "forbidden")
    return NextResponse.json({ error: "Everyone involved must be a trip attendee" }, { status: 403 });
  return NextResponse.json(result, { status: 201 });
}

/** Undo a recorded payment. Organizer only. */
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
    trip.payments = trip.payments.filter((p) => p.id !== body.id);
    return { trip };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden")
    return NextResponse.json({ error: "Only the organizer can undo a payment" }, { status: 403 });
  return NextResponse.json(result);
}
