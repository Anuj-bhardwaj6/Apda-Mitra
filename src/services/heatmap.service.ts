/**
 * Multi-Hazard Risk Heatmap Computation Service
 * Synthesizes cyclone wind radii, river flood stages, and slope instability into risk density fields.
 */

export interface RiskHeatPoint {
  lat: number;
  lng: number;
  intensity: number; // 0.0 to 1.0
  hazardType: "cyclone" | "flood" | "landslide" | "urban_waterlogging";
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  color: string;
  radiusKm: number;
}

// TODO(API)
// ISRO Bhuvan & NDMA Early Warning Vulnerability Grid
// Endpoint: https://ndma.gov.in/api/v1/spatial_risk_matrix?grid=0.05deg
export async function computeMultiHazardRiskGrid(): Promise<RiskHeatPoint[]> {
  console.info("[HeatmapService] Computing multi-hazard risk intensity field");

  return [
    // Cyclone Landfall Core (Red - Critical)
    {
      lat: 20.82,
      lng: 87.21,
      intensity: 0.95,
      hazardType: "cyclone",
      severity: "CRITICAL",
      color: "#D32F2F", // Red
      radiusKm: 35,
    },
    // Coastal Surge Sector (Orange - High)
    {
      lat: 21.15,
      lng: 87.12,
      intensity: 0.82,
      hazardType: "cyclone",
      severity: "HIGH",
      color: "#F9A825", // Orange / Warning
      radiusKm: 45,
    },
    // Inner Block Watch Zone (Yellow - Moderate)
    {
      lat: 21.48,
      lng: 86.92,
      intensity: 0.58,
      hazardType: "urban_waterlogging",
      severity: "MODERATE",
      color: "#FBC02D", // Yellow
      radiusKm: 25,
    },
    // Safe High Ground Evacuation Perimeter (Green - Safe)
    {
      lat: 21.65,
      lng: 86.75,
      intensity: 0.15,
      hazardType: "cyclone",
      severity: "LOW",
      color: "#2E7D32", // Green
      radiusKm: 30,
    },
  ];
}
