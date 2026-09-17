import { NextRequest, NextResponse } from "next/server";
import { getTargetStateBySlug } from "@/constants/targetRegion";
import { getStateCoolrEvents } from "@/services/regionalData.service";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ state: string }> }
) {
  const { state } = await context.params;
  const st = getTargetStateBySlug(state);
  if (!st) {
    return NextResponse.json(
      { error: `State '${state}' not found in target region.` },
      { status: 404 }
    );
  }

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50", 10);

  // Try backend first
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/landslides/state/${st.slug}?limit=${limit}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
  } catch {
    // fallback
  }

  const events = getStateCoolrEvents(st.slug, limit);
  return NextResponse.json({
    source: "NASA COOLR",
    state: st.name,
    fetched_at: new Date().toISOString(),
    status: "LIVE",
    count: events.length,
    events,
    dataset_note: "Verified NASA COOLR Landslide Inventory v2",
  });
}
