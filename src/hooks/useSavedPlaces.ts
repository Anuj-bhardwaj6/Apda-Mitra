"use client";

import { useState, useEffect, useCallback } from "react";
import { SavedPlace, SavedPlaceType, LocationModel } from "@/types/location";
import { PlacesService } from "@/services/places.service";
import { useCurrentLocation } from "./useCurrentLocation";

export function useSavedPlaces() {
  const { setLocation } = useCurrentLocation();
  const [places, setPlaces] = useState<SavedPlace[]>([]);

  const refresh = useCallback(() => {
    setPlaces(PlacesService.getSavedPlaces());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPlace = useCallback(
    (label: string, type: SavedPlaceType, location: LocationModel, notes?: string) => {
      const created = PlacesService.savePlace(label, type, location, notes);
      refresh();
      return created;
    },
    [refresh]
  );

  const removePlace = useCallback(
    (id: string) => {
      PlacesService.removeSavedPlace(id);
      refresh();
    },
    [refresh]
  );

  const selectPlace = useCallback(
    (place: SavedPlace) => {
      setLocation(place.location);
    },
    [setLocation]
  );

  return {
    places,
    addPlace,
    removePlace,
    selectPlace,
    refresh,
  };
}
