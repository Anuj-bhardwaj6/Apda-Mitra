"use client";

import { createContext } from "react";
import { LocationModel, LocationPermissionStatus, LocationSource } from "@/types/location";

export interface LocationContextType {
  // State
  location: LocationModel;
  liveGpsCoords: [number, number] | null;
  accuracyMeters: number | null;
  headingDegrees: number | null;
  speedMps: number | null;
  isMoving: boolean;
  isLiveGpsActive: boolean;
  isLoading: boolean;
  error: string | null;
  permissionStatus: LocationPermissionStatus;

  // Actions
  refreshCurrentLocation: () => Promise<void>;
  setLocation: (newLocation: LocationModel) => void;
  setLocationFromCoordinates: (
    lat: number,
    lng: number,
    source?: LocationSource
  ) => Promise<void>;
  requestPermission: () => Promise<LocationPermissionStatus>;
  toggleLiveGps: () => void;
  clearError: () => void;
}

export const LocationContext = createContext<LocationContextType | null>(null);
