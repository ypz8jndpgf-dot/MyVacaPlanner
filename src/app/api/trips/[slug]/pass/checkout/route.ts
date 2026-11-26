import { NextResponse } from "next/server";
import { getSessionEmail, VERIFY_MSG } from "@/lib/auth";
import { isOrganizerId } from "@/lib/logic";
import { PASS_PRICE_CENTS, passEnabled, passStripeSecret, tripHasPass } from "@/lib/pass";
import { getTrip } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Organizer Pass checkout entry point ($19.99, one-time per trip).
 *
 * Ships dark, mirroring Noble Beast's disabled-checkout pattern: until
 * MVP_PASS_ENABLED=1 AND MVP_STRIPE_SECRET_KEY are set, this returns
 * 503 with the amount that *would* be charged, and nothing is sold.
 * The Stripe account/key is created by the owner at enable time; this
 * code only ever reads the env.
 *
 * When live, it creates a Stripe Checkout Session (plain fetch against
 * the Stripe API — no SDK, same as the other integrations here) with
 * metadata.tripSlug; payment confirmation arrives via
 * /api/stripe/webhook, which is the only place the pass is granted.
 * Only an organizer of the trip may start checkout — attendees never
 * see pricing and can't buy a pass for someone else's trip from here.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!passEnabled()) {
    return NextResponse.json(
      {
        error: "checkout_not_live",
        message: "The Organizer Pass isn't on sale yet — your trip works fully without it.",
        amountCents: PASS_PRICE_CENTS,
      },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => null)) as { actorId?: string } | null;
  if (!body?.actorId)
    return NextResponse.json({ error: "actorId is required" }, { status: 400 });

  const trip = await getTrip(slug);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (!isOrganizerId(trip, body.actorId))
    return NextResponse.json(
      { error: "Only the trip organizer can unlock the pass" },
      { status: 403 }
    );
  // The buyer must be verified as the organizer's email — a forwarded link
  // can't check out a pass wearing the organizer's name.
  {
    const organizer = trip.attendees.find((a) => a.id === body.actorId);
    if (organizer?.email && (await getSessionEmail()) !== organizer.email)
      return NextResponse.json({ error: VERIFY_MSG, code: "VERIFY_REQUIRED" }, { status: 403 });
  }
  if (tripHasPass(trip)) return NextResponse.json({ ok: true, alreadyPurchased: true });

  const secret = passStripeSecret();
  if (!secret) {
    return NextResponse.json(
      {
        error: "checkout_not_live",
        message: "The Organizer Pass isn't on sale yet — your trip works fully without it.",
        amountCents: PASS_PRICE_CENTS,
      },
      { status: 503 }
    );
  }

  const buyer = trip.attendees.find((a) => a.id === body.actorId);
  const origin = new URL(req.url).origin;
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", `${origin}/t/${slug}?pass=success`);
  form.set("cancel_url", `${origin}/t/${slug}?pass=cancelled`);
  form.set("client_reference_id", slug);
  form.set("metadata[tripSlug]", slug);
  form.set("metadata[buyerName]", buyer?.name ?? "Organizer");
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "usd");
  form.set("line_items[0][price_data][unit_amount]", String(PASS_PRICE_CENTS));
  form.set(
    "line_items[0][price_data][product_data][name]",
    `Organizer Pass — ${trip.name}`
  );
  form.set(
    "line_items[0][price_data][product_data][description]",
    "One-time unlock for this trip: paid-up tracking, group fund, co-organizers, pinned announcement and itinerary lock."
  );

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const session = (await res.json().catch(() => null)) as { url?: string } | null;
    if (!res.ok || !session?.url) {
      console.error(`mvp pass checkout: Stripe session create failed: ${res.status}`);
      return NextResponse.json(
        {
          error: "checkout_failed",
          message: "We couldn't open secure checkout just now — please try again in a moment. Nothing was charged.",
        },
        { status: 502 }
      );
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("mvp pass checkout: Stripe session create threw", e);
    return NextResponse.json(
      {
        error: "checkout_failed",
        message: "We couldn't open secure checkout just now — please try again in a moment. Nothing was charged.",
      },
      { status: 502 }
    );
  }
}
