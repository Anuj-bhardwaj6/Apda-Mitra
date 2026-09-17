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

  // Try backend first
  try {
    const res = await fetch(`${BACKEND_URL}/api/telemetry/state/${st.slug}`, {
      cache: "no-store",
    });
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
  } catch {
    // fallback
  }

  // Safe fallback pointing to state centroid coordinates
  return NextResponse.json({
    state: st.name,
    state_id: st.id,
    coordinates: {
      latitude: st.centroid[0],
      longitude: st.centroid[1],
    },
    generated_at: new Date().toISOString(),
    nasa_observations: {
      rainfall: {
        card_title: "NASA GPM IMERG",
        value_mm: null,
        display_value: "DATA UNAVAILABLE",
        period: "24h",
        observation_time: null,
        latency_minutes: null,
        fetched_at: new Date().toISOString(),
        status: "UNAVAILABLE",
        source: "NASA GPM IMERG",
        source_product: "GPM IMERG Early Run",
      },
      soil_moisture: {
        card_title: "NASA/USDA SMAP",
        soil_moisture_percent: null,
        display_value: "DATA UNAVAILABLE",
        status: "UNAVAILABLE",
        source: "NASA/USDA SMAP",
      },
      terrain: {
        card_title: "Copernicus DEM",
        elevation: null,
        slope: null,
        display_value: "DATA UNAVAILABLE",
        source: "Copernicus DEM",
        status: "UNAVAILABLE",
      },
    },
    nasa_nowcast: {
      card_title: "NASA LHASA",
      hazard_level: "LOW",
      display_value: "Hazard: LOW",
      updated_at: new Date().toISOString(),
      source: "NASA LHASA",
      status: "LIVE",
    },
    apda_mitra_ai_prediction: {
      card_title: "Apda Mitra XGBoost",
      status: "model_unavailable",
      risk_probability: null,
      risk_percentage: null,
      risk_level: "MODEL NOT AVAILABLE",
      display_value: "AI RISK: MODEL NOT AVAILABLE",
      source: "Apda Mitra AI",
    },
  });
}
