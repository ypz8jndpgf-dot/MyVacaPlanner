import type { Trip } from "./types";

/**
 * Organizer Pass — server-side configuration.
 *
 * The whole feature ships DARK: nothing about the pass is reachable
 * unless MVP_PASS_ENABLED=1 in the server environment. The flag is
 * read per-request (not cached at module load) so flipping it never
 * needs a code change, and the client learns about it only through
 * GET /api/config.
 *
 * Checkout additionally needs MVP_STRIPE_SECRET_KEY (a Stripe account
 * belonging to MyVacaPlanner under the LLC — created by the owner at
 * enable time, never before). The webhook needs
 * MVP_STRIPE_WEBHOOK_SECRET. All three stay unset in production until
 * the owner turns the pass on.
 */

export const PASS_PRICE_CENTS = 1999; // $19.99, one-time per trip

export function passEnabled(): boolean {
  return process.env.MVP_PASS_ENABLED === "1";
}

export function passStripeSecret(): string | undefined {
  return process.env.MVP_STRIPE_SECRET_KEY || undefined;
}

export function passWebhookSecret(): string | undefined {
  return process.env.MVP_STRIPE_WEBHOOK_SECRET || undefined;
}

/** True when this trip has actually purchased the pass. */
export function tripHasPass(trip: Trip): boolean {
  return Boolean(trip.pass?.purchasedAt);
}

/**
 * Gate for every pass-feature endpoint. Returns an error descriptor
 * ({ status, error }) or null when the caller may proceed:
 *  - flag off            -> 503 (feature dark, same as it not existing)
 *  - trip without a pass -> 403 (organizer hasn't unlocked it)
 */
export function passGate(trip: Trip): { status: number; error: string } | null {
  if (!passEnabled()) return { status: 503, error: "pass_not_enabled" };
  if (!tripHasPass(trip))
    return { status: 403, error: "This trip hasn't unlocked the Organizer Pass" };
  return null;
}
