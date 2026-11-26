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

/** Email the pass-upgrade announcement to every attendee with an email on
 *  file, one message each (nobody sees anyone else's address). Sent via
 *  Resend from the verified myvacaplanner.com domain; MVP_RESEND_API_KEY is
 *  a sending key on the same Resend account as Noble Beast's. Fail-soft by
 *  design — callers must never let a mail failure fail the webhook. */
async function sendPassAnnouncement(g: {
  name: string;
  slug: string;
  byName: string;
  emails: string[];
}): Promise<void> {
  const key = process.env.MVP_RESEND_API_KEY;
  if (!key || g.emails.length === 0) return;
  const url = `https://myvacaplanner.com/t/${g.slug}`;
  const subject = `⭐ ${g.name} just went Premium`;
  const text = `${g.byName} upgraded "${g.name}" with the Organizer Pass — this trip just went Premium!\n\nNow unlocked:\n• Paid-up tracking for every split\n• A group fund for the big shared costs\n• Pinned announcements\n• A lockable itinerary\n\nSee the trip: ${url}\n\n— MyVacaPlanner (trip updates only; reply STOP to opt out)`;
  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:8px">
  <div style="background:linear-gradient(135deg,#0b5563,#128091);border-radius:20px;padding:28px 24px;color:#ffffff">
    <div style="font-size:22px;font-weight:800">⭐ ${g.name} just went Premium</div>
    <p style="margin:10px 0 0;font-size:15px;line-height:1.5;color:#d7f0ee">${g.byName} upgraded this trip with the <b>Organizer Pass</b> — here's what the whole crew just unlocked:</p>
    <div style="margin-top:14px">
      <span style="display:inline-block;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:700;margin:0 4px 6px 0">✓ Paid-up tracking</span>
      <span style="display:inline-block;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:700;margin:0 4px 6px 0">✓ Group fund</span>
      <span style="display:inline-block;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:700;margin:0 4px 6px 0">✓ Co-organizers</span>
      <span style="display:inline-block;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:700;margin:0 4px 6px 0">✓ Itinerary lock</span>
    </div>
    <a href="${url}" style="display:inline-block;margin-top:18px;background:#f5b93f;color:#3a2a00;font-weight:800;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:999px">Open the trip →</a>
  </div>
  <p style="color:#8a94a0;font-size:12px;text-align:center;margin-top:14px">MyVacaPlanner · trip updates only, never marketing · reply STOP to opt out</p>
</div>`;
  await Promise.all(
    g.emails.map(async (to) => {
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 5000);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "MyVacaPlanner <trips@myvacaplanner.com>",
            to: [to],
            subject,
            html,
            text,
          }),
          signal: ctl.signal,
        });
        clearTimeout(timer);
        if (!res.ok) console.error("mvp webhook: announcement email failed", res.status, await res.text());
      } catch (e) {
        console.error("mvp webhook: announcement email error", e);
      }
    })
  );
}

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
      let granted: { name: string; slug: string; byName: string; emails: string[] } | null = null;
      await updateDB((db) => {
        const trip = db.trips.find((t) => t.slug === tripSlug);
        if (!trip || tripHasPass(trip)) return;
        trip.pass = {
          purchasedAt: Date.now(),
          byName: session.metadata?.buyerName?.trim() || "Organizer",
          stripeSessionId: session.id ?? "stripe",
        };
        // The upgrade announces itself: pin the celebratory announcement
        // every crew member sees at the top of the Plan tab. Only when the
        // organizer hasn't already pinned one of their own.
        if (!trip.announcement) {
          trip.announcement = {
            text: `⭐ ${trip.pass.byName} upgraded this trip with the Organizer Pass — this trip just went Premium! Now unlocked: paid-up tracking for every split, a group fund for the big shared costs, pinned announcements like this one, and a lockable itinerary. 🎉`,
            byName: trip.pass.byName,
            at: Date.now(),
            auto: "pass-upgrade",
          };
        }
        granted = {
          name: trip.name,
          slug: trip.slug,
          byName: trip.pass.byName,
          emails: [...new Set(trip.attendees.map((a) => a.email).filter((e): e is string => !!e))],
        };
      }).catch((e: Error) => {
        console.error("mvp webhook: granting pass failed", e);
      });
      // …and the same announcement goes out by email to every crew member
      // who has one on file. Fail-soft: a mail problem never fails the
      // webhook (Stripe would retry and the grant is already recorded).
      if (granted) await sendPassAnnouncement(granted).catch(() => {});
    }
  }

  return NextResponse.json({ received: true });
}
