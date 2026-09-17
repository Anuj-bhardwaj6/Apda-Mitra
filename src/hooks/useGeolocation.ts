"use client";

import { useState, useCallback } from "react";

interface GeolocationState {
  coords: [number, number] | null; // [lat, lng]
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation(initialCoords: [number, number] = [20.82, 87.21]) {
  const [state, setState] = useState<GeolocationState>({
    coords: initialCoords,
    accuracy: null,
    loading: false,
    error: null,
  });

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          coords: [pos.coords.latitude, pos.coords.longitude],
          accuracy: pos.coords.accuracy,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err.message || "Unable to retrieve GPS coordinates",
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  }, []);

  return {
    ...state,
    getCurrentLocation,
    setCustomCoords: (coords: [number, number]) =>
      setState((prev) => ({ ...prev, coords })),
  };
}
