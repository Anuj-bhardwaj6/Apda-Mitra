import { NextResponse } from "next/server";
import { TARGET_REGION_BBOX, TARGET_STATES } from "@/constants/targetRegion";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/telemetry/region`, { cache: "no-store" });
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
  } catch {
    // fallback
  }

  return NextResponse.json({
    region: "APDA MITRA TARGET REGION",
    bbox: TARGET_REGION_BBOX,
    states_monitored: TARGET_STATES.length,
    status: "LIVE",
  });
}
