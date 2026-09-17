import { NextRequest, NextResponse } from "next/server";
import { getTargetStateBySlug } from "@/constants/targetRegion";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export async function GET(
  _request: NextRequest,
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

  try {
    const res = await fetch(`${BACKEND_URL}/api/risk/state/${st.slug}`, {
      cache: "no-store",
    });
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
  } catch {
    // fallback
  }

  return NextResponse.json({
    state: st.name,
    status: "model_unavailable",
    risk_probability: null,
    risk_level: "MODEL NOT AVAILABLE",
    message: "AI RISK: MODEL NOT AVAILABLE",
  });
}
