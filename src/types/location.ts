export type LocationSource = "gps" | "search" | "saved" | "cached" | "default";

export type LocationPermissionStatus = "granted" | "denied" | "prompt" | "unavailable";

export type SavedPlaceType =
  | "home"
  | "work"
  | "family"
  | "village"
  | "shelter"
  | "hospital"
  | "custom";

export interface LocationModel {
  latitude: number;
  longitude: number;
  district: string;
  state: string;
  country: string;
  village?: string;
  city?: string;
  postalCode?: string;
  formattedAddress: string;
  accuracy: number | null; // meters
  altitude?: number | null;
  heading?: number | null; // degrees
  speed?: number | null; // m/s
  timestamp: number; // epoch ms
  permissionStatus: LocationPermissionStatus;
  source: LocationSource;
  isMoving?: boolean;
}

export interface GeocodedResult {
  id: string;
  name: string;
  formattedAddress: string;
  district: string;
  state: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  category: "district" | "city" | "village" | "hospital" | "shelter" | "road" | "landmark";
  distanceMeters?: number;
  isRecent?: boolean;
  isSaved?: boolean;
}

export interface SavedPlace {
  id: string;
  label: string;
  type: SavedPlaceType;
  location: LocationModel;
  notes?: string;
  createdAt: number;
}

export interface RecentLocationItem {
  id: string;
  result: GeocodedResult;
  usedCount: number;
  lastUsedAt: number;
}
