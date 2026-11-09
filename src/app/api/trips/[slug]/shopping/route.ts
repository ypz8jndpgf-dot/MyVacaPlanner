import { NextResponse } from "next/server";
import { newId, updateDB } from "@/lib/store";
import type { ShoppingItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function canModify(
  trip: { attendees: { id: string; isOrganizer: boolean }[] },
  item: ShoppingItem,
  actorId: string
): boolean {
  const actor = trip.attendees.find((a) => a.id === actorId);
  return Boolean(actor && (actor.isOrganizer || item.createdBy === actorId));
}

/** Add a shopping item. Any attendee. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    actorId?: string;
    name?: string;
    quantity?: string;
    note?: string;
  } | null;
  if (!body?.actorId || !body.name?.trim())
    return NextResponse.json({ error: "actorId and name are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    if (!trip.attendees.some((a) => a.id === body.actorId)) return "forbidden" as const;
    if (!Array.isArray(trip.shopping)) trip.shopping = [];
    const item: ShoppingItem = {
      id: newId("sho"),
      name: body.name!.trim(),
      quantity: body.quantity?.trim() || undefined,
      note: body.note?.trim() || undefined,
      checked: false,
      createdBy: body.actorId!,
      createdAt: Date.now(),
    };
    trip.shopping.push(item);
    return { item, trip };
  });

  if (!result) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Join the trip first" }, { status: 403 });
  return NextResponse.json(result, { status: 201 });
}

/**
 * Update a shopping item. Toggling `checked` is open to any attendee (it's a
 * shared list); editing name/quantity/note is creator or organizer only.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    actorId?: string;
    checked?: boolean;
    name?: string;
    quantity?: string;
    note?: string;
  } | null;
  if (!body?.id || !body.actorId)
    return NextResponse.json({ error: "id and actorId are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    if (!Array.isArray(trip.shopping)) trip.shopping = [];
    const item = trip.shopping.find((s) => s.id === body.id);
    if (!item) return null;
    if (!trip.attendees.some((a) => a.id === body.actorId)) return "forbidden" as const;
    const editsFields = body.name !== undefined || body.quantity !== undefined || body.note !== undefined;
    if (editsFields && !canModify(trip, item, body.actorId!)) return "forbidden" as const;
    if (body.name?.trim()) item.name = body.name.trim();
    if (body.quantity !== undefined) item.quantity = body.quantity.trim() || undefined;
    if (body.note !== undefined) item.note = body.note.trim() || undefined;
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

/** Delete a shopping item. Creator or organizer. */
export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as { id?: string; actorId?: string } | null;
  if (!body?.id || !body.actorId)
    return NextResponse.json({ error: "id and actorId are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    if (!Array.isArray(trip.shopping)) trip.shopping = [];
    const item = trip.shopping.find((s) => s.id === body.id);
    if (!item) return null;
    if (!canModify(trip, item, body.actorId!)) return "forbidden" as const;
    trip.shopping = trip.shopping.filter((s) => s.id !== body.id);
    return { trip };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json(result);
}
