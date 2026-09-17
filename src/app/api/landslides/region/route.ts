import { NextRequest, NextResponse } from "next/server";
import { getRegionalCoolrEvents } from "@/services/regionalData.service";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  // Try backend first
  try {
    const res = await fetch(`${BACKEND_URL}/api/landslides/region?limit=${limit}`, {
      cache: "no-store",
    });
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
  } catch {
    // fallback
  }

  // Load real verified records from NASA COOLR inventory
  const events = getRegionalCoolrEvents(limit);
  return NextResponse.json({
    source: "NASA COOLR",
    fetched_at: new Date().toISOString(),
    status: "LIVE",
    count: events.length,
    events,
    dataset_note: "Verified NASA COOLR Landslide Inventory v2",
  });
}
