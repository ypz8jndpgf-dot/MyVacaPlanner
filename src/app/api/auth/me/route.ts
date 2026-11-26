import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Who is verified on this device? { email: string | null } */
export async function GET() {
  return NextResponse.json({ email: await getSessionEmail() });
}
