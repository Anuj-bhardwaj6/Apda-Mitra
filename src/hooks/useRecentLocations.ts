"use client";

import { useState, useEffect, useCallback } from "react";
import { GeocodedResult } from "@/types/location";
import { PlacesService } from "@/services/places.service";
import { useCurrentLocation } from "./useCurrentLocation";

export function useRecentLocations() {
  const { setLocationFromCoordinates } = useCurrentLocation();
  const [recents, setRecents] = useState<GeocodedResult[]>([]);

  const refresh = useCallback(() => {
    setRecents(PlacesService.getRecentPlaces());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectRecent = useCallback(
    async (item: GeocodedResult) => {
      PlacesService.recordSearch(item);
      refresh();
      await setLocationFromCoordinates(item.latitude, item.longitude, "search");
    },
    [refresh, setLocationFromCoordinates]
  );

  const clearRecents = useCallback(() => {
    PlacesService.clearRecentPlaces();
    setRecents([]);
  }, []);

  return {
    recents,
    selectRecent,
    clearRecents,
    refresh,
  };
}
