import { NextResponse } from "next/server";
import { passEnabled } from "@/lib/pass";

export const dynamic = "force-dynamic";

/**
 * Public client config. Exposes only feature switches — never keys or
 * internals. The Organizer Pass UI renders nothing at all unless
 * passEnabled is true here.
 */
export async function GET() {
  return NextResponse.json({ passEnabled: passEnabled() });
}
