import type { Trip, Transfer } from "./types";

/** Split `amountCents` equally among n people; remainder cents go to the
 *  first `amount % n` participants (in the order given). Sums exactly. */
export function splitCents(amountCents: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(amountCents / n);
  const remainder = amountCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Net balance per attendee, in cents.
 * Positive = the group owes this person money ("is owed").
 * Negative = this person owes the group.
 * Expenses add to the payer and subtract each participant's share;
 * recorded settle-up Payments move the payer back toward zero.
 */
export function computeBalances(trip: Trip): Map<string, number> {
  const balances = new Map<string, number>();
  const add = (id: string, cents: number) =>
    balances.set(id, (balances.get(id) ?? 0) + cents);

  for (const a of trip.attendees) if (!balances.has(a.id)) balances.set(a.id, 0);

  for (const exp of trip.expenses) {
    if (exp.splitAmong.length === 0) continue;
    add(exp.paidBy, exp.amountCents);
    const shares = splitCents(exp.amountCents, exp.splitAmong.length);
    exp.splitAmong.forEach((id, i) => add(id, -shares[i]));
  }

  for (const pay of trip.payments) {
    add(pay.fromId, pay.amountCents); // payer's debt shrinks
    add(pay.toId, -pay.amountCents); // recipient's credit shrinks
  }

  return balances;
}

/** Greedy minimal set of transfers that zeroes every balance. */
export function settleUp(balances: Map<string, number>): Transfer[] {
  const debtors: { id: string; cents: number }[] = []; // cents = amount owed (positive)
  const creditors: { id: string; cents: number }[] = []; // cents = amount due (positive)
  for (const [id, net] of balances) {
    if (net < 0) debtors.push({ id, cents: -net });
    else if (net > 0) creditors.push({ id, cents: net });
  }
  debtors.sort((a, b) => b.cents - a.cents);
  creditors.sort((a, b) => b.cents - a.cents);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].cents, creditors[j].cents);
    if (amount > 0) {
      transfers.push({ fromId: debtors[i].id, toId: creditors[j].id, amountCents: amount });
    }
    debtors[i].cents -= amount;
    creditors[j].cents -= amount;
    if (debtors[i].cents === 0) i++;
    if (creditors[j].cents === 0) j++;
  }
  return transfers;
}

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** "2027-01-16" -> "Fri, Jan 16" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatTime(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return hhmm;
  let h = Number(match[1]);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${match[2]} ${suffix}`;
}

/** Inclusive list of YYYY-MM-DD dates between start and end. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const cur = new Date(Date.UTC(sy, sm - 1, sd));
  const last = new Date(Date.UTC(ey, em - 1, ed));
  while (cur <= last && out.length < 60) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}
