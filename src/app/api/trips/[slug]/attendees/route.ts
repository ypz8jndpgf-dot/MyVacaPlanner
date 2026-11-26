import { NextResponse } from "next/server";
import { cleanEmail } from "@/lib/email";
import { newId, updateDB } from "@/lib/store";
import type { Attendee, Rsvp } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Join a trip with a display name (the link is the key). Email is a
 *  mandatory part of joining since Nov 26, 2026 — it's the identity anchor
 *  attendees expect and how trip mail (announcements, pass upgrades) reaches
 *  them. A name already on the list that has no email yet must supply one to
 *  claim; a name with an email on file claims with one tap as before. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    rsvp?: Rsvp;
    email?: string;
    /** True when someone else adds this name (contacts picker): the adder
     *  can't know the person's email, so creation is allowed without one —
     *  mandatory email then bites when that person claims the name. */
    addedByOther?: boolean;
  } | null;
  if (!body?.name?.trim())
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  const email = cleanEmail(body.email);

  const result = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    // Re-joining with the same name returns the existing attendee (phone switching, link re-taps).
    const existing = trip.attendees.find(
      (a) => a.name.trim().toLowerCase() === body.name!.trim().toLowerCase()
    );
    if (existing) {
      if (!existing.email) {
        // Legacy (pre-email) record: claiming it requires an email.
        if (!email) return "email-required" as const;
        existing.email = email;
      } else if (email) {
        existing.email = email; // let a claim correct a typo'd address
      }
      if (body.rsvp) existing.rsvp = body.rsvp;
      return { attendee: existing, trip };
    }
    if (!email && !body.addedByOther) return "email-required" as const;
    const attendee: Attendee = {
      id: newId("att"),
      name: body.name!.trim(),
      rsvp: body.rsvp ?? "in",
      isOrganizer: false,
      createdAt: Date.now(),
      ...(email ? { email } : {}),
    };
    trip.attendees.push(attendee);
    return { attendee, trip };
  });

  if (!result) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (result === "email-required")
    return NextResponse.json(
      { error: "A valid email is required — it's how this trip reaches you.", code: "EMAIL_REQUIRED" },
      { status: 400 }
    );
  return NextResponse.json(result, { status: 201 });
}

/** Sanitize a payment handle: returns the cleaned handle, null to clear, or
 *  undefined when the value is absent/invalid (leave unchanged). */
function cleanHandle(v: unknown, kind: "venmo" | "cashapp"): string | null | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().replace(/^[@$]+/, "");
  if (s === "") return null;
  const ok = kind === "venmo" ? /^[A-Za-z0-9_-]{3,30}$/.test(s) : /^[A-Za-z0-9_]{1,20}$/.test(s);
  return ok ? s : undefined;
}

/** Change RSVP / rename / payment handles. Self or organizer. */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    actorId?: string;
    rsvp?: Rsvp;
    name?: string;
    email?: string;
    venmo?: string;
    cashapp?: string;
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
    const email = cleanEmail(body.email);
    if (email) target.email = email;
    const venmo = cleanHandle(body.venmo, "venmo");
    if (venmo === null) delete target.venmo;
    else if (venmo !== undefined) target.venmo = venmo;
    const cashapp = cleanHandle(body.cashapp, "cashapp");
    if (cashapp === null) delete target.cashapp;
    else if (cashapp !== undefined) target.cashapp = cashapp;
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
