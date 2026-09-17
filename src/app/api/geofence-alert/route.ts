import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch("http://127.0.0.1:8000/api/v1/ai/landslide/geofence-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.warn("[API/geofence-alert] FastAPI backend unreachable", err);
  }

  // Strictly refuse false alarms when backend or telemetry is unreachable
  return NextResponse.json({
    success: false,
    message: "Disaster telemetry backend unreachable. Live geofence evaluation unavailable.",
    data: {
      is_alert_triggered: false,
      threat_tier: "UNAVAILABLE",
      distance_to_critical_hazard_km: null,
      hazard_location_name: "Data Unavailable",
      push_notification_payload: null,
      safe_evacuation_zone: null,
    },
  }, { status: 503 });
}
