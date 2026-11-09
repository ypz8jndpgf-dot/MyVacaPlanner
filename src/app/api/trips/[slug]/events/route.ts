import { NextResponse } from "next/server";
import { getTrip } from "@/lib/store";

export const dynamic = "force-dynamic";

export interface TripEvent {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD (venue-local)
  time?: string; // HH:MM (venue-local)
  venue?: string;
  lat?: number;
  lon?: number;
  url: string;
  image?: string;
  category?: string;
}

/**
 * Events at the destination during the trip dates, via the Ticketmaster
 * Discovery API. Dormant until TICKETMASTER_API_KEY is set in the server env
 * (free self-serve key from developer.ticketmaster.com) — the client hides
 * the strip entirely when `enabled` is false.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) return NextResponse.json({ enabled: false, events: [] });

  const trip = await getTrip(slug);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (!trip.location?.trim()) return NextResponse.json({ enabled: true, events: [] });

  const parts = trip.location.split(",").map((p) => p.trim()).filter(Boolean);
  // People write nicknames ("Philly"); Discovery needs the real city name.
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
  };
  const city = CITY_ALIASES[parts[0].toLowerCase()] ?? parts[0];
  const state = parts[1] && /^[A-Za-z]{2}$/.test(parts[1]) ? parts[1].toUpperCase() : undefined;

  const qs = new URLSearchParams({
    apikey: apiKey,
    city,
    startDateTime: `${trip.startDate}T00:00:00Z`,
    endDateTime: `${trip.endDate}T23:59:59Z`,
    size: "60",
    sort: "date,asc",
    locale: "en",
  });
  if (state) qs.set("stateCode", state);

  try {
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${qs}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return NextResponse.json({ enabled: true, events: [], error: true });
    const data = (await res.json()) as {
      _embedded?: {
        events?: {
          id: string;
          name: string;
          url: string;
          dates?: { start?: { localDate?: string; localTime?: string } };
          images?: { url: string; ratio?: string; width?: number }[];
          classifications?: { segment?: { name?: string } }[];
          _embedded?: {
            venues?: {
              name?: string;
              city?: { name?: string };
              location?: { latitude?: string; longitude?: string };
            }[];
          };
        }[];
      };
    };
    const events: TripEvent[] = (data._embedded?.events ?? [])
      // The UTC query window can catch the previous local evening — keep
      // only events on the trip's actual local dates.
      .filter((e) => {
        const d = e.dates?.start?.localDate;
        return d !== undefined && d >= trip.startDate && d <= trip.endDate;
      })
      .map((e) => {
      const venue = e._embedded?.venues?.[0];
      const images = e.images ?? [];
      const image =
        images.find((i) => i.ratio === "16_9" && (i.width ?? 0) >= 640)?.url ?? images[0]?.url;
      return {
        id: e.id,
        name: e.name,
        date: e.dates?.start?.localDate ?? trip.startDate,
        time: e.dates?.start?.localTime?.slice(0, 5),
        venue: venue?.name,
        lat: venue?.location?.latitude ? parseFloat(venue.location.latitude) : undefined,
        lon: venue?.location?.longitude ? parseFloat(venue.location.longitude) : undefined,
        url: e.url,
        image,
        category: e.classifications?.[0]?.segment?.name,
      };
    });
    return NextResponse.json({ enabled: true, events });
  } catch {
    return NextResponse.json({ enabled: true, events: [], error: true });
  }
}
