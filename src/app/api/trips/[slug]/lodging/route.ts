import { NextResponse } from "next/server";
import { updateDB } from "@/lib/store";
import type { LodgingInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

const FIELDS = [
  "name",
  "address",
  "checkIn",
  "checkOut",
  "accessCode",
  "wifi",
  "contact",
  "url",
  "notes",
] as const;

/**
 * Save the trip's lodging ("where we're staying"). Shared crew info, like the
 * shopping list — the trip link is the access key (no login), so a save does
 * not require claiming an attendee identity first; if actorId is sent it must
 * belong to an attendee. Send `clear: true` to remove.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as
    | ({ actorId?: string; clear?: boolean } & Partial<Record<(typeof FIELDS)[number], string>>)
    | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  if (!body.clear && !body.name?.trim())
    return NextResponse.json({ error: "Give the stay a name (e.g. Airbnb, hotel name)" }, { status: 400 });

  const updated = await updateDB((db) => {
    const trip = db.trips.find((t) => t.slug === slug);
    if (!trip) return null;
    if (body.actorId && !trip.attendees.some((a) => a.id === body.actorId))
      return "forbidden" as const;
    if (body.clear) {
      delete trip.lodging;
    } else {
      const lodging: LodgingInfo = {
        name: body.name!.trim(),
        updatedBy: body.actorId,
        updatedAt: Date.now(),
      };
      for (const f of FIELDS) {
        if (f === "name") continue;
        const v = body[f]?.trim();
        if (v) lodging[f] = v;
      }
      trip.lodging = lodging;
    }
    return trip;
  });

  if (!updated) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (updated === "forbidden")
    return NextResponse.json({ error: "Join the trip first" }, { status: 403 });
  return NextResponse.json({ trip: updated });
}
