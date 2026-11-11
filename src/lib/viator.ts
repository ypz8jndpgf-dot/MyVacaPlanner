/**
 * Viator affiliate activities (partner program, joined 2026-11-10).
 *
 * The affiliate model is link-based: any viator.com URL carrying the
 * partner params earns commission on bookings. The partner ID is public
 * by design — it appears in every link we publish — so it lives here
 * with env overrides, not in secrets storage.
 *
 * The catalog is curated per destination city: real Viator product pages,
 * verified live when added. Cities without a catalog entry simply get no
 * activity strip yet (the API route reports enabled:false).
 */

export interface ViatorActivity {
  id: string;
  title: string;
  blurb: string;
  /** Canonical viator.com path (no locale prefix, no query). */
  path: string;
  /** Short meta shown on the card, e.g. "4 hours · Private group". */
  meta: string;
  /** Display price note, e.g. "From $52" — only when verified at curation. */
  priceNote?: string;
  emoji: string;
}

export interface ViatorCity {
  /** Canonical city name the catalog is keyed by (post-alias). */
  city: string;
  /** Destination ("things to do") path on viator.com. */
  browsePath: string;
  activities: ViatorActivity[];
}

const PID = process.env.VIATOR_PID || "P00331058";
const MCID = process.env.VIATOR_MCID || "42383";
const CAMPAIGN = process.env.VIATOR_CAMPAIGN || "Myvacaplanner";

/** Append the affiliate tracking params to a viator.com URL or path. */
export function viatorLink(pathOrUrl: string): string {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `https://www.viator.com${pathOrUrl}`;
  const sep = url.includes("?") ? "&" : "?";
  const qs = new URLSearchParams({
    pid: PID,
    mcid: MCID,
    medium: "link",
    campaign: CAMPAIGN,
  });
  return `${url}${sep}${qs.toString()}`;
}

const CATALOG: Record<string, ViatorCity> = {
  philadelphia: {
    city: "Philadelphia",
    browsePath: "/Philadelphia/d906-ttd",
    activities: [
      {
        id: "phl-rocky-movie-tour",
        title: "Yo! A Private Rocky Balboa Driving Tour",
        blurb:
          "The crew's own victory lap: Mick's gym, Adrian's pet shop, the Italian Market, and the Rocky statue & steps — private van, hotel pickup included.",
        path: "/tours/Philadelphia/Private-Rocky-Movie-Tour/d906-8841P2",
        meta: "4 hours · Private group",
        priceNote: "From $695 per group",
        emoji: "🥊",
      },
      {
        id: "phl-by-night-bus",
        title: "Philly By Night Double-Decker Bus Tour",
        blurb:
          "27 sights in 90 minutes after dark — Liberty Bell, City Hall, Penn's Landing — with a stop to run up the Rocky Steps yourselves.",
        path: "/tours/Philadelphia/Philly-By-Night-Double-Decker-Bus-Tour/d906-13471P2",
        meta: "1.5 hours · Guided bus tour",
        priceNote: "From $52",
        emoji: "🌃",
      },
      {
        id: "phl-food-tour",
        title: "Best of Philadelphia Food Tour",
        blurb:
          "Small-group walk from Reading Terminal Market to Sansom Street — five food stops including a proper cheesesteak. Max 12 people.",
        path: "/tours/Philadelphia/Best-of-Philadelphia-Food-Tour-Small-Group-Walking-Tour/d906-8841P34",
        meta: "Walking tour · Small group",
        emoji: "🥨",
      },
      {
        id: "phl-explorer-pass",
        title: "Go City: Philadelphia Explorer Pass",
        blurb:
          "Pick 3 to 7 attractions — Big Bus tour, Eastern State Penitentiary, Franklin Institute, Museum of Art and more — one pass, valid 30 days.",
        path: "/tours/Philadelphia/The-Philadelphia-Pass/d906-3958PHILLYEXP",
        meta: "1–30 days · Attraction pass",
        priceNote: "From $59",
        emoji: "🎫",
      },
    ],
  },
  orlando: {
    city: "Orlando",
    browsePath: "/Orlando/d663-ttd",
    activities: [
      {
        id: "orl-manatee-swim",
        title: "Crystal River Manatee Swim",
        blurb:
          "January is peak manatee season: boat out on Crystal River, snorkel alongside the gentle giants, then Homosassa Springs Wildlife Park. Round-trip from Orlando, lunch included.",
        path: "/tours/Orlando/Crystal-River-Manatee-Swim-from-Orlando/d663-3170P40",
        meta: "Full day · Small group",
        priceNote: "From $169",
        emoji: "🦭",
      },
      {
        id: "orl-kennedy-express",
        title: "Kennedy Space Center Express",
        blurb:
          "The Space Coast day trip, zero driving: express bus from ICON Park, admission included — Space Shuttle Atlantis, the Saturn V Center, and the Shuttle Launch Experience.",
        path: "/tours/Orlando/Kennedy-Space-Center-Express/d663-3170P79",
        meta: "Full day · Admission included",
        priceNote: "From $174",
        emoji: "🚀",
      },
      {
        id: "orl-airboat-wild-florida",
        title: "Everglades Airboat Tour & Wild Florida",
        blurb:
          "Skim 4,200 acres of protected swamp on a 30-minute or 1-hour airboat, then the Gator Park — 200+ animals. The easiest off-course afternoon in the catalog.",
        path: "/tours/Orlando/Florida-Everglades-Airboat-Tour-and-Alligator-Encounter-with-Optional-Lunch/d663-5467OHEP",
        meta: "1 hour + park · Airboat",
        priceNote: "From $37",
        emoji: "🐊",
      },
      {
        id: "orl-explorer-pass",
        title: "Go City: Orlando Explorer Pass",
        blurb:
          "Pick 2 to 5 attractions — The Wheel at ICON Park, WonderWorks, SEA LIFE, Madame Tussauds and more — one pass, valid 30 days.",
        path: "/tours/Orlando/Orlando-Explorer-Pass/d663-3958ORLEXP",
        meta: "1–30 days · Attraction pass",
        priceNote: "From $64",
        emoji: "🎫",
      },
    ],
  },
};

/** Look up the curated catalog for a canonical city name (case-insensitive). */
export function viatorCity(city: string): ViatorCity | null {
  return CATALOG[city.trim().toLowerCase()] ?? null;
}
