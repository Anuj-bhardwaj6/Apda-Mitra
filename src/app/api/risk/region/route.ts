import { NextResponse } from "next/server";
import { TARGET_STATES } from "@/constants/targetRegion";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/risk/region`, { cache: "no-store" });
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
  } catch {
    // fallback
  }

  // Safe default: Model not available (never invent fake risk numbers)
  return NextResponse.json({
    region: "APDA MITRA TARGET REGION",
    generated_at: new Date().toISOString(),
    risk_status: "model_unavailable",
    risk_overlay_available: false,
    message: "APDA MITRA AI: MODEL NOT AVAILABLE",
    states: TARGET_STATES.map((st) => ({
      state: st.name,
      risk_level: "MODEL NOT AVAILABLE",
      risk_probability: null,
    })),
  });
}
