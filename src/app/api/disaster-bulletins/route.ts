import { NextResponse } from "next/server";
import { MOCK_DISASTER_INCIDENTS } from "@/constants/mockData";

export async function GET() {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/v1/alerts/active", {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        const mapped = data.data.map((item: any) => ({
          id: item.id || item.bulletin_id,
          bulletinId: item.bulletin_id,
          title: item.title,
          category: item.category,
          severity: item.severity,
          alertLevel: item.alert_level,
          issuedBy: item.issued_by,
          issuanceTime: item.created_at || "Just now",
          headline: item.headline,
          description: item.description,
          affectedDistricts: item.affected_districts || [],
          state: item.state,
          coordinates: [item.latitude, item.longitude],
          radiusKm: item.radius_km,
          evacuationStatus: item.evacuation_status || "NONE",
          safeCorridorRoute: item.safe_corridor_route,
          recommendedActions: item.recommended_actions || [],
          activeHelpline: item.active_helpline || "112",
        }));
        return NextResponse.json({
          success: true,
          source: "FastAPI Backend (/api/v1/alerts/active)",
          timestamp: new Date().toISOString(),
          bulletins: mapped,
        });
      }
    }
  } catch (err) {
    console.warn("[API/DisasterBulletins] FastAPI backend unreachable, using fallback", err);
  }

  return NextResponse.json({
    success: true,
    source: "Local Resilience Fallback",
    timestamp: new Date().toISOString(),
    bulletins: MOCK_DISASTER_INCIDENTS,
  });
}

