"use client";

import { useCurrentLocation } from "./useCurrentLocation";

export function useLocationPermission() {
  const { permissionStatus, requestPermission, isLoading, error } = useCurrentLocation();

  return {
    permissionStatus,
    isGranted: permissionStatus === "granted",
    isDenied: permissionStatus === "denied",
    isPrompt: permissionStatus === "prompt",
    isUnavailable: permissionStatus === "unavailable",
    requestPermission,
    isLoading,
    error,
  };
}
