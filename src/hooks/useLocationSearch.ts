"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GeocodedResult } from "@/types/location";
import { GeocodingService } from "@/services/geocoding.service";
import { PlacesService } from "@/services/places.service";
import { useCurrentLocation } from "./useCurrentLocation";

export function useLocationSearch(debounceMs = 250) {
  const { location, setLocationFromCoordinates } = useCurrentLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodedResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const userLoc = location ? { lat: location.latitude, lng: location.longitude } : undefined;
        const data = await GeocodingService.autocomplete(query, userLoc);
        setResults(data);
        setIsOpen(data.length > 0);
      } catch (err) {
        console.warn("[useLocationSearch] Error searching locations", err);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs, location]);

  const selectResult = useCallback(
    async (result: GeocodedResult) => {
      // Record search in recents
      PlacesService.recordSearch(result);
      setQuery(result.name);
      setIsOpen(false);

      // Broadcast update to global context
      await setLocationFromCoordinates(result.latitude, result.longitude, "search");
    },
    [setLocationFromCoordinates]
  );

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    selectResult,
    clear,
  };
}
