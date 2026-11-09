import { NextResponse } from "next/server";
import { getTrip } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Daily forecast for the trip destination via Open-Meteo (free, no key).
 * Statuses: ok | no_location | too_far (forecast window is ~16 days) | past |
 * unavailable. The client renders nothing for non-ok statuses except a small
 * "forecast lands closer to the trip" note for too_far.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getTrip(slug);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (!trip.location?.trim()) return NextResponse.json({ status: "no_location" });

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const horizon = new Date(today.getTime() + 15 * 86400000).toISOString().slice(0, 10);
  if (trip.endDate < todayIso) return NextResponse.json({ status: "past" });
  if (trip.startDate > horizon)
    return NextResponse.json({
      status: "too_far",
      daysUntil: Math.round(
        (new Date(`${trip.startDate}T00:00:00Z`).getTime() - new Date(`${todayIso}T00:00:00Z`).getTime()) / 86400000
      ),
    });

  const from = trip.startDate < todayIso ? todayIso : trip.startDate;
  const to = trip.endDate > horizon ? horizon : trip.endDate;

  try {
    const query = trip.location.split(",")[0].trim();
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`,
      { next: { revalidate: 86400 } }
    );
    if (!geoRes.ok) throw new Error(`geocode ${geoRes.status}`);
    const geo = (await geoRes.json()) as {
      results?: { latitude: number; longitude: number; name: string; admin1?: string }[];
    };
    const place = geo.results?.[0];
    if (!place) return NextResponse.json({ status: "unavailable" });

    const fcRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&temperature_unit=fahrenheit&timezone=auto&start_date=${from}&end_date=${to}`,
      { next: { revalidate: 3600 } }
    );
    if (!fcRes.ok) throw new Error(`forecast ${fcRes.status}`);
    const fc = (await fcRes.json()) as {
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: (number | null)[];
      };
    };
    if (!fc.daily) return NextResponse.json({ status: "unavailable" });

    const days = fc.daily.time.map((date, i) => ({
      date,
      code: fc.daily!.weather_code[i],
      hi: Math.round(fc.daily!.temperature_2m_max[i]),
      lo: Math.round(fc.daily!.temperature_2m_min[i]),
      precip: fc.daily!.precipitation_probability_max[i] ?? null,
    }));
    return NextResponse.json({
      status: "ok",
      place: place.admin1 ? `${place.name}, ${place.admin1}` : place.name,
      days,
    });
  } catch {
    return NextResponse.json({ status: "unavailable" });
  }
}
