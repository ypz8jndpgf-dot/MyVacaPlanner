import { NextResponse } from "next/server";
import { newId, updateDB } from "@/lib/store";
import type { Expense } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Add an expense. Any attendee. Amount is integer cents. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    actorId?: string;
    description?: string;
    amountCents?: number;
    paidBy?: string;
    splitAmong?: string[];
    date?: string;
  } | null;
  if (
    !body?.actorId ||
    !body.description?.trim() ||
    typeof body.amountCents !== "number" ||
    !Number.isInteger(body.amountCents) ||
    body.amountCents <= 0 ||
    !body.paidBy ||
    !Array.isArray(body.splitAmong) ||
    body.splitAmong.length === 0
  ) {
    return NextResponse.json(
      { error: "actorId, description, positive integer amountCents, paidBy and non-empty splitAmong are required" },
      { status: 400 }
    );
  }

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    const ids = new Set(trip.attendees.map((a) => a.id));
    if (!ids.has(body.actorId!) || !ids.has(body.paidBy!)) return "forbidden" as const;
    const split = [...new Set(body.splitAmong!)].filter((id) => ids.has(id));
    if (split.length === 0) return "forbidden" as const;
    const expense: Expense = {
      id: newId("exp"),
      description: body.description!.trim(),
      amountCents: body.amountCents!,
      paidBy: body.paidBy!,
      splitAmong: split,
      date: body.date || trip.startDate,
      createdBy: body.actorId!,
      createdAt: Date.now(),
    };
    trip.expenses.push(expense);
    return { expense, trip };
  });

  if (!result) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (result === "forbidden")
    return NextResponse.json({ error: "Payer and split members must be trip attendees" }, { status: 403 });
  return NextResponse.json(result, { status: 201 });
}

/** Delete an expense. Creator or organizer. */
export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as { id?: string; actorId?: string } | null;
  if (!body?.id || !body.actorId)
    return NextResponse.json({ error: "id and actorId are required" }, { status: 400 });

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    const expense = trip.expenses.find((e) => e.id === body.id);
    if (!expense) return null;
    const actor = trip.attendees.find((a) => a.id === body.actorId);
    if (!actor || (!actor.isOrganizer && expense.createdBy !== body.actorId))
      return "forbidden" as const;
    trip.expenses = trip.expenses.filter((e) => e.id !== body.id);
    return { trip };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json(result);
}
