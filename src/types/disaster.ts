export type DisasterSeverity = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
export type AlertLevel = "RED" | "ORANGE" | "YELLOW" | "GREEN";

export type DisasterCategory =
  | "CYCLONE"
  | "FLOOD"
  | "LANDSLIDE"
  | "EARTHQUAKE"
  | "HEATWAVE"
  | "URBAN_WATERLOGGING"
  | "TSUNAMI";

export interface DisasterIncident {
  id: string;
  bulletinId: string;
  title: string;
  category: DisasterCategory;
  severity: DisasterSeverity;
  alertLevel: AlertLevel;
  issuedBy: "NDMA" | "IMD" | "CWC" | "INCOIS" | "SDMA";
  issuanceTime: string;
  headline: string;
  description: string;
  affectedDistricts: string[];
  state: string;
  coordinates: [number, number]; // [lat, lng]
  radiusKm?: number;
  evacuationStatus: "MANDATORY" | "ADVISORY" | "STANDBY" | "NONE";
  safeCorridorRoute?: string;
  recommendedActions: string[];
  activeHelpline: string;
}

export interface CitizenReportPayload {
  category: DisasterCategory;
  description: string;
  latitude: number;
  longitude: number;
  landmark: string;
  contactNumber: string;
  urgency: "LIFE_THREATENING" | "URGENT_ASSISTANCE" | "PROPERTY_HAZARD" | "INFORMATION_ONLY";
  photoUrl?: string;
}
