import { NextResponse } from "next/server";
import { getTrip } from "@/lib/store";
import { viatorCity, viatorLink } from "@/lib/viator";

export const dynamic = "force-dynamic";

export interface TripActivity {
  id: string;
  title: string;
  blurb: string;
  meta: string;
  priceNote?: string;
  emoji: string;
  url: string;
}

/**
 * Bookable activities at the destination, via the Viator affiliate
 * program (link-based — no API key). The catalog is curated per city in
 * lib/viator.ts; cities without an entry report enabled:false and the
 * client hides the strip entirely.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getTrip(slug);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (!trip.location?.trim()) return NextResponse.json({ enabled: false, activities: [] });

  const parts = trip.location.split(",").map((p) => p.trim()).filter(Boolean);
  // Same nickname handling as the events route — "Philly" is not a city
  // Viator knows.
  const CITY_ALIASES: Record<string, string> = {
    philly: "Philadelphia",
    nyc: "New York",
    "new york city": "New York",
    la: "Los Angeles",
    sf: "San Francisco",
    vegas: "Las Vegas",
    nola: "New Orleans",
    atl: "Atlanta",
    dc: "Washington",
    "washington dc": "Washington",
    chi: "Chicago",
    beantown: "Boston",
    // Kissimmee is the Orlando vacation-home corridor — same catalog.
    kissimmee: "Orlando",
  };
  const city = CITY_ALIASES[parts[0].toLowerCase()] ?? parts[0];

  const entry = viatorCity(city);
  if (!entry) return NextResponse.json({ enabled: false, activities: [] });

  const activities: TripActivity[] = entry.activities.map((a) => ({
    id: a.id,
    title: a.title,
    blurb: a.blurb,
    meta: a.meta,
    priceNote: a.priceNote,
    emoji: a.emoji,
    url: viatorLink(a.path),
  }));

  return NextResponse.json({
    enabled: true,
    city: entry.city,
    browseUrl: viatorLink(entry.browsePath),
    activities,
  });
}
