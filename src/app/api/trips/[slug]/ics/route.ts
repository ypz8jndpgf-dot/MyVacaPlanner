import { getTrip } from "@/lib/store";

export const dynamic = "force-dynamic";

function esc(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function ymd(iso: string): string {
  return iso.replace(/-/g, "");
}

function addDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + 1));
  return date.toISOString().slice(0, 10);
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Download the trip as an .ics calendar file: one all-day event spanning the
 * trip plus every schedule item (timed items become floating local-time
 * events; untimed items are all-day).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getTrip(slug);
  if (!trip) return new Response("Trip not found", { status: 404 });

  const now = stamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MyVacaPlanner//Trip Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(trip.name)}`,
  ];

  const pushEvent = (uid: string, summary: string, dtLines: string[], extra: string[] = []) => {
    lines.push("BEGIN:VEVENT", `UID:${uid}@myvacaplanner.com`, `DTSTAMP:${now}`, ...dtLines);
    lines.push(`SUMMARY:${esc(summary)}`, ...extra, "END:VEVENT");
  };

  pushEvent(`trip-${trip.slug}`, `✈️ ${trip.name}`, [
    `DTSTART;VALUE=DATE:${ymd(trip.startDate)}`,
    `DTEND;VALUE=DATE:${ymd(addDay(trip.endDate))}`,
  ], trip.location ? [`LOCATION:${esc(trip.location)}`] : []);

  for (const item of trip.schedule ?? []) {
    const extra: string[] = [];
    if (item.location) extra.push(`LOCATION:${esc(item.location)}`);
    if (item.notes) extra.push(`DESCRIPTION:${esc(item.notes)}`);
    const timeMatch = item.time ? /^(\d{1,2}):(\d{2})$/.exec(item.time.trim()) : null;
    if (timeMatch) {
      const hh = String(Number(timeMatch[1])).padStart(2, "0");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${item.id}@myvacaplanner.com`,
        `DTSTAMP:${now}`,
        `DTSTART:${ymd(item.date)}T${hh}${timeMatch[2]}00`,
        `SUMMARY:${esc(item.title)}`,
        ...extra,
        "END:VEVENT"
      );
    } else {
      pushEvent(item.id, item.title, [
        `DTSTART;VALUE=DATE:${ymd(item.date)}`,
        `DTEND;VALUE=DATE:${ymd(addDay(item.date))}`,
      ], extra);
    }
  }

  lines.push("END:VCALENDAR");

  const filename = `${trip.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trip"}.ics`;
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
