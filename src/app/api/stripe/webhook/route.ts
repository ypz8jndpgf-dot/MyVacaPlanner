import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { passWebhookSecret, tripHasPass } from "@/lib/pass";
import { updateDB } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook for Organizer Pass purchases — the ONLY place a pass
 * is granted (the checkout success redirect is never trusted).
 *
 * Signature verification is manual with node:crypto (no Stripe SDK):
 * the Stripe-Signature header carries `t=<unix>` and one or more
 * `v1=<hex>` values; the signed payload is `${t}.${rawBody}` under
 * HMAC-SHA256 with MVP_STRIPE_WEBHOOK_SECRET. Signatures older than
 * 5 minutes are rejected.
 *
 * With MVP_STRIPE_WEBHOOK_SECRET unset the endpoint is inert (503) —
 * it must be set alongside MVP_PASS_ENABLED / MVP_STRIPE_SECRET_KEY
 * when the owner turns the pass on.
 */

const TOLERANCE_SECONDS = 300;

function signatureValid(header: string | null, rawBody: string, secret: string): boolean {
  if (!header) return false;
  let timestamp: string | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "v1") signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((sig) => {
    let candidate: Buffer;
    try {
      candidate = Buffer.from(sig, "hex");
    } catch {
      return false;
    }
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

interface StripeSession {
  id?: string;
  payment_status?: string;
  metadata?: { tripSlug?: string; buyerName?: string } | null;
}

export async function POST(req: Request) {
  const secret = passWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }
  const rawBody = await req.text();
  if (!signatureValid(req.headers.get("stripe-signature"), rawBody, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: StripeSession } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object ?? {};
    const tripSlug = session.metadata?.tripSlug;
    if (session.payment_status === "paid" && tripSlug) {
      // Idempotent: a trip that already has its pass is left as-is.
      await updateDB((db) => {
        const trip = db.trips.find((t) => t.slug === tripSlug);
        if (!trip || tripHasPass(trip)) return;
        trip.pass = {
          purchasedAt: Date.now(),
          byName: session.metadata?.buyerName?.trim() || "Organizer",
          stripeSessionId: session.id ?? "stripe",
        };
      }).catch((e: Error) => {
        console.error("mvp webhook: granting pass failed", e);
      });
    }
  }

  return NextResponse.json({ received: true });
}
