import type { DB, Trip } from "./types";

/**
 * Storage adapter with two backends:
 *  (a) Upstash Redis REST when UPSTASH_REDIS_REST_URL / _TOKEN are set
 *      (single JSON blob under key "mvp:db" — fine at friend-group scale)
 *  (b) local JSON file at <cwd>/data/db.json (zero-config local fallback)
 *
 * All mutations go through `update()`, which serializes read-modify-write
 * cycles with a simple promise chain so concurrent requests in the same
 * process can't clobber each other.
 */

const REDIS_KEY = "mvp:db";

function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rand}`;
}

export function makeSlug(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return rand;
}

export { newId };

function seedDB(): DB {
  const organizerId = newId("att");
  const moyapalooza: Trip = {
    slug: "moyapalooza-2027",
    name: "Moyapalooza",
    location: "",
    startDate: "2027-01-16",
    endDate: "2027-01-18",
    createdAt: Date.now(),
    attendees: [
      {
        id: organizerId,
        name: "Adam",
        rsvp: "in",
        isOrganizer: true,
        createdAt: Date.now(),
      },
    ],
    schedule: [],
    flights: [],
    expenses: [],
    payments: [],
  };
  return { trips: [moyapalooza] };
}

// ---------- backend primitives ----------

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = Boolean(redisUrl && redisToken);

async function redisLoad(): Promise<DB | null> {
  const res = await fetch(`${redisUrl}/get/${encodeURIComponent(REDIS_KEY)}`, {
    headers: { Authorization: `Bearer ${redisToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis GET failed: ${res.status}`);
  const data = (await res.json()) as { result: string | null };
  if (!data.result) return null;
  return JSON.parse(data.result) as DB;
}

async function redisSave(db: DB): Promise<void> {
  const res = await fetch(`${redisUrl}/set/${encodeURIComponent(REDIS_KEY)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(JSON.stringify(db)),
  });
  if (!res.ok) throw new Error(`Redis SET failed: ${res.status}`);
}

async function fileLoad(): Promise<DB | null> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const file = path.join(process.cwd(), "data", "db.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as DB;
  } catch {
    return null;
  }
}

async function fileSave(db: DB): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), "data");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "db.json"), JSON.stringify(db, null, 2), "utf8");
}

// ---------- public API ----------

let chain: Promise<unknown> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function loadDB(): Promise<DB> {
  const db = useRedis ? await redisLoad() : await fileLoad();
  if (db && Array.isArray(db.trips)) return db;
  const seeded = seedDB();
  await saveDB(seeded);
  return seeded;
}

export async function saveDB(db: DB): Promise<void> {
  if (useRedis) await redisSave(db);
  else await fileSave(db);
}

/** Serialized read-modify-write. Return a value from the mutator to pass it back. */
export function updateDB<T>(mutator: (db: DB) => T): Promise<T> {
  return serialize(async () => {
    const db = await loadDB();
    const result = mutator(db);
    await saveDB(db);
    return result;
  });
}

export async function getTrip(slug: string): Promise<Trip | null> {
  const db = await loadDB();
  return db.trips.find((t) => t.slug === slug) ?? null;
}

export function storageBackend(): string {
  return useRedis ? "upstash-redis" : "local-json-file";
}
