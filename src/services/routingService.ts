import { GeocodingService } from "./geocoding.service";
import { calculateEvacuationRoute, EvacuationRouteDetail } from "./routing.service";

/**
 * Evacuation Corridors and Geocoding Service
 * Integrates OSRM routing and OpenStreetMap Nominatim reverse geocoding.
 */

export interface EvacuationRoute {
  origin: [number, number];
  destination: [number, number];
  distanceMeters: number;
  durationSeconds: number;
  safetyScore: number;
  geometryPolyline: [number, number][];
  warningNotices: string[];
}

/**
 * Calculates a safe evacuation corridor between coordinates using the live OSRM routing engine.
 */
export async function calculateSafeEvacuationRoute(
  origin: [number, number],
  destination: [number, number]
): Promise<EvacuationRoute> {
  const result = await calculateEvacuationRoute(origin, destination);
  const primary = result.primaryRoute;

  return {
    origin,
    destination,
    distanceMeters: Math.round(primary.distanceKm * 1000),
    durationSeconds: primary.durationMinutes * 60,
    safetyScore: primary.safetyScorePercent,
    geometryPolyline: primary.polylineCoordinates,
    warningNotices: primary.roadHazardsAvoided,
  };
}

/**
 * Reverse geocodes [lat, lon] to an Indian district and address via live OpenStreetMap Nominatim.
 */
export async function reverseGeocodeLocation(lat: number, lon: number): Promise<{
  formattedAddress: string;
  district: string;
  state: string;
  pincode: string;
}> {
  const resolved = await GeocodingService.reverse(lat, lon);
  return {
    formattedAddress: resolved.formattedAddress || "Active Monitoring Sector",
    district: resolved.district || "Emergency District",
    state: resolved.state || "India",
    pincode: resolved.postalCode || "000000",
  };
}
