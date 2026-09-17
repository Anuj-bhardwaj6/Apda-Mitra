"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { LocationContext, LocationContextType } from "./LocationContext";
import { LocationModel, LocationPermissionStatus, LocationSource } from "@/types/location";
import { LocationService } from "@/services/location.service";
import { GeocodingService } from "@/services/geocoding.service";
import { PermissionService } from "@/services/permission.service";
import { StorageService } from "@/services/storage.service";

// Default Indian Coastal High Hazard Corridor fallback (No hardcoded Wayanad)
const DEFAULT_FALLBACK_LOCATION: LocationModel = {
  latitude: 21.468,
  longitude: 87.014,
  district: "Balasore",
  state: "Odisha",
  country: "India",
  formattedAddress: "Chandipur Coastal Sector, Balasore District",
  accuracy: 35,
  timestamp: Date.now(),
  permissionStatus: "prompt",
  source: "default",
};

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<LocationModel>(() => {
    return StorageService.getLastKnownLocation() || DEFAULT_FALLBACK_LOCATION;
  });

  const [liveGpsCoords, setLiveGpsCoords] = useState<[number, number] | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [headingDegrees, setHeadingDegrees] = useState<number | null>(null);
  const [speedMps, setSpeedMps] = useState<number | null>(null);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [isLiveGpsActive, setIsLiveGpsActive] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>("prompt");

  const watchIdRef = useRef<number | null>(null);

  // Apply new location & persist
  const setLocation = useCallback((newLoc: LocationModel) => {
    setLocationState(newLoc);
    StorageService.saveLastKnownLocation(newLoc);
  }, []);

  // Update location from raw coordinates via reverse geocode
  const setLocationFromCoordinates = useCallback(
    async (lat: number, lng: number, source: LocationSource = "search") => {
      setIsLoading(true);
      setError(null);
      try {
        const geocoded = await GeocodingService.reverse(lat, lng);
        const resolved: LocationModel = {
          latitude: lat,
          longitude: lng,
          district: geocoded.district || "Emergency Sector",
          state: geocoded.state || "India",
          country: geocoded.country || "India",
          city: geocoded.city,
          village: geocoded.village,
          postalCode: geocoded.postalCode,
          formattedAddress: geocoded.formattedAddress || `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
          accuracy: accuracyMeters,
          heading: headingDegrees,
          speed: speedMps,
          timestamp: Date.now(),
          permissionStatus,
          source,
          isMoving,
        };
        setLocation(resolved);
      } catch (err: any) {
        setError(err?.message || "Failed to resolve address.");
      } finally {
        setIsLoading(false);
      }
    },
    [accuracyMeters, headingDegrees, speedMps, permissionStatus, isMoving, setLocation]
  );

  // Fetch current GPS fix once
  const refreshCurrentLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fix = await LocationService.getCurrentLocation();
      setLiveGpsCoords([fix.latitude, fix.longitude]);
      setAccuracyMeters(fix.accuracy);
      setHeadingDegrees(fix.heading);
      setSpeedMps(fix.speed);
      setPermissionStatus("granted");

      await setLocationFromCoordinates(fix.latitude, fix.longitude, "gps");
    } catch (err: any) {
      if (err?.code === 1) {
        setPermissionStatus("denied");
        setError("Location permission was denied. Tap 'Enable Location' to activate live alerts.");
      } else if (err?.code === 3) {
        setError("GPS signal request timed out. Using last known location.");
      } else {
        setError(err?.message || "Unable to retrieve GPS coordinates.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [setLocationFromCoordinates]);

  // Request browser permission explicitly
  const requestPermission = useCallback(async (): Promise<LocationPermissionStatus> => {
    const status = await LocationService.requestPermission();
    setPermissionStatus(status);
    if (status === "granted") {
      await refreshCurrentLocation();
    }
    return status;
  }, [refreshCurrentLocation]);

  // Toggle background watchPosition
  const toggleLiveGps = useCallback(() => {
    setIsLiveGpsActive((prev) => !prev);
  }, []);

  // 1. Initial Permission Check
  useEffect(() => {
    PermissionService.queryGeolocationPermission().then((status) => {
      setPermissionStatus(status);
      if (status === "granted") {
        refreshCurrentLocation();
      }
    });

    const unsubscribe = PermissionService.subscribePermissionChange((status) => {
      setPermissionStatus(status);
      if (status === "granted") {
        refreshCurrentLocation();
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [refreshCurrentLocation]);

  // 2. Watch Position when live GPS is active
  useEffect(() => {
    if (!isLiveGpsActive || permissionStatus !== "granted") {
      if (watchIdRef.current !== null) {
        LocationService.stopWatching();
        watchIdRef.current = null;
      }
      return;
    }

    const id = LocationService.watchLocation(
      (pos) => {
        setLiveGpsCoords([pos.latitude, pos.longitude]);
        setAccuracyMeters(pos.accuracy);
        setHeadingDegrees(pos.heading);
        setSpeedMps(pos.speed);
        setIsMoving(pos.isMoving);

        // If user moved significantly, update active location
        if (pos.isMoving) {
          setLocationFromCoordinates(pos.latitude, pos.longitude, "gps");
        }
      },
      (err) => {
        console.warn("[LocationProvider] GPS Watch error", err.message);
      },
      { enableHighAccuracy: true, movementThresholdMeters: 15 }
    );

    watchIdRef.current = id;

    return () => {
      LocationService.stopWatching();
      watchIdRef.current = null;
    };
  }, [isLiveGpsActive, permissionStatus, setLocationFromCoordinates]);

  const value: LocationContextType = {
    location,
    liveGpsCoords,
    accuracyMeters,
    headingDegrees,
    speedMps,
    isMoving,
    isLiveGpsActive,
    isLoading,
    error,
    permissionStatus,
    refreshCurrentLocation,
    setLocation,
    setLocationFromCoordinates,
    requestPermission,
    toggleLiveGps,
    clearError: () => setError(null),
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}
