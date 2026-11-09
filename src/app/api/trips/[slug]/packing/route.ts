import { NextResponse } from "next/server";
import { newId, updateDB } from "@/lib/store";
import type { PackingItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function canModify(
  trip: { attendees: { id: string; isOrganizer: boolean }[] },
  item: PackingItem,
  actorId: string
): boolean {
  const actor = trip.attendees.find((a) => a.id === actorId);
  return Boolean(actor && (actor.isOrganizer || item.createdBy === actorId));
}

/** Add a to-bring item. Any attendee; may claim it for themselves on create. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    actorId?: string;
    name?: string;
    quantity?: string;
    note?: string;
    assignedTo?: string;
  } | null;
  if (!body?.actorId || !body.name?.trim())
    return NextResponse.json({ error: "actorId and name are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    if (!trip.attendees.some((a) => a.id === body.actorId)) return "forbidden" as const;
    if (!Array.isArray(trip.packing)) trip.packing = [];
    const assignedTo =
      body.assignedTo && trip.attendees.some((a) => a.id === body.assignedTo)
        ? body.assignedTo
        : undefined;
    const item: PackingItem = {
      id: newId("pak"),
      name: body.name!.trim(),
      quantity: body.quantity?.trim() || undefined,
      note: body.note?.trim() || undefined,
      assignedTo,
      checked: false,
      createdBy: body.actorId!,
      createdAt: Date.now(),
    };
    trip.packing.push(item);
    return { item, trip };
  });

  if (!result) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Join the trip first" }, { status: 403 });
  return NextResponse.json(result, { status: 201 });
}

/**
 * Update a to-bring item. Toggling `checked` (packed) and claiming/releasing
 * (`assignedTo`) are open to any attendee; editing the item itself is creator
 * or organizer only. Send assignedTo: null to release a claim.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    actorId?: string;
    checked?: boolean;
    assignedTo?: string | null;
    name?: string;
    quantity?: string;
    note?: string;
  } | null;
  if (!body?.id || !body.actorId)
    return NextResponse.json({ error: "id and actorId are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    if (!Array.isArray(trip.packing)) trip.packing = [];
    const item = trip.packing.find((s) => s.id === body.id);
    if (!item) return null;
    if (!trip.attendees.some((a) => a.id === body.actorId)) return "forbidden" as const;
    const editsFields = body.name !== undefined || body.quantity !== undefined || body.note !== undefined;
    if (editsFields && !canModify(trip, item, body.actorId!)) return "forbidden" as const;
    if (body.name?.trim()) item.name = body.name.trim();
    if (body.quantity !== undefined) item.quantity = body.quantity.trim() || undefined;
    if (body.note !== undefined) item.note = body.note.trim() || undefined;
    if (body.assignedTo !== undefined) {
      if (body.assignedTo === null) item.assignedTo = undefined;
      else if (trip.attendees.some((a) => a.id === body.assignedTo)) item.assignedTo = body.assignedTo;
    }
    if (body.checked !== undefined) {
      item.checked = body.checked;
      item.checkedBy = body.checked ? body.actorId! : undefined;
    }
    return { trip };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json(result);
}

/** Delete a to-bring item. Creator or organizer. */
export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as { id?: string; actorId?: string } | null;
  if (!body?.id || !body.actorId)
    return NextResponse.json({ error: "id and actorId are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    if (!Array.isArray(trip.packing)) trip.packing = [];
    const item = trip.packing.find((s) => s.id === body.id);
    if (!item) return null;
    if (!canModify(trip, item, body.actorId!)) return "forbidden" as const;
    trip.packing = trip.packing.filter((s) => s.id !== body.id);
    return { trip };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json(result);
}
