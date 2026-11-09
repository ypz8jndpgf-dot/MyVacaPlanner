import { NextResponse } from "next/server";
import { getTrip, loadDB, updateDB } from "@/lib/store";
import { GET as eventsGET } from "../events/route";

export const dynamic = "force-dynamic";

export interface MapPoint {
  label: string;
  sub?: string;
  lat: number;
  lon: number;
  kind: "event" | "plan";
}

/**
 * Map points for a trip: one pin per event venue (coordinates from the
 * Ticketmaster payload) plus one pin per schedule item that names a place
 * (geocoded via Nominatim, cached in the DB blob — friend-group scale).
 */
async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "MyVacaPlanner/1.0 (trip map geocoding)" } }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat?: string; lon?: string }[];
    if (!rows[0]?.lat || !rows[0]?.lon) return null;
    return { lat: parseFloat(rows[0].lat), lon: parseFloat(rows[0].lon) };
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getTrip(slug);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  const tripLocation = trip.location ?? "";

  const points: MapPoint[] = [];

  // --- Event venues (reuse the events route so its cache applies) ---
  try {
    const res = await eventsGET(req, { params: Promise.resolve({ slug }) });
    const data = (await res.json()) as {
      enabled?: boolean;
      events?: { venue?: string; lat?: number; lon?: number; name: string; date: string }[];
    };
    if (data.enabled && Array.isArray(data.events)) {
      const byVenue = new Map<string, { lat: number; lon: number; count: number; first: string }>();
      for (const e of data.events) {
        if (!e.venue || e.lat === undefined || e.lon === undefined) continue;
        const cur = byVenue.get(e.venue);
        if (cur) cur.count += 1;
        else byVenue.set(e.venue, { lat: e.lat, lon: e.lon, count: 1, first: e.name });
      }
      for (const [venue, v] of byVenue) {
        points.push({
          label: venue,
          sub: v.count > 1 ? `${v.count} events · incl. ${v.first}` : v.first,
          lat: v.lat,
          lon: v.lon,
          kind: "event",
        });
      }
    }
  } catch {
    // Events are a bonus layer; the map still works with plan pins alone.
  }

  // --- Schedule items with a place named ---
  const db = await loadDB();
  const cache: Record<string, { lat: number; lon: number }> = { ...(db.geo ?? {}) };
  const fresh: Record<string, { lat: number; lon: number }> = {};
  const seenQuery = new Map<string, { lat: number; lon: number } | null>();
  let lookups = 0;

  async function resolvePlace(raw: string): Promise<{ lat: number; lon: number } | null> {
    const loc = raw.trim();
    if (!loc) return null;
    const withCity =
      tripLocation && !loc.toLowerCase().includes(tripLocation.split(",")[0].trim().toLowerCase())
        ? `${loc}, ${tripLocation}`
        : loc;
    const key = withCity.toLowerCase();
    if (seenQuery.has(key)) return seenQuery.get(key) ?? null;
    if (cache[key]) {
      seenQuery.set(key, cache[key]);
      return cache[key];
    }
    if (lookups >= 10) {
      seenQuery.set(key, null);
      return null;
    }
    lookups += 1;
    if (lookups > 1) await sleep(1050); // Nominatim fair-use: ~1 req/sec
    const hit = await geocode(withCity);
    seenQuery.set(key, hit);
    if (hit) {
      cache[key] = hit;
      fresh[key] = hit;
    }
    return hit;
  }

  const planSeen = new Set<string>();
  for (const item of trip.schedule) {
    if (!item.location?.trim()) continue;
    const coords = await resolvePlace(item.location);
    if (!coords) continue;
    const dedupeKey = `${item.location.trim().toLowerCase()}|${coords.lat.toFixed(4)}`;
    if (planSeen.has(dedupeKey)) continue;
    planSeen.add(dedupeKey);
    points.push({ label: item.location, sub: item.title, lat: coords.lat, lon: coords.lon, kind: "plan" });
  }

  if (Object.keys(fresh).length > 0) {
    const toSave = { ...fresh };
    await updateDB((d) => {
      d.geo = { ...(d.geo ?? {}), ...toSave };
    }).catch(() => undefined);
  }

  // --- Center: the destination itself ---
  // Center frames the map on the destination; it is not a pin of its own.
  let center: { lat: number; lon: number } | null = null;
  if (tripLocation.trim()) {
    center = await resolvePlace(tripLocation);
  }

  return NextResponse.json({ center, points });
}
