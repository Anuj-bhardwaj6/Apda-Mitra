"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, X, Mic, Navigation, History, Bookmark, MapPin } from "lucide-react";
import { useLocationSearch } from "@/hooks/useLocationSearch";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useRecentLocations } from "@/hooks/useRecentLocations";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";
import { SearchResultCard } from "./SearchResultCard";
import { LocationSkeleton } from "./LocationSkeleton";
import { GeocodedResult, SavedPlace } from "@/types/location";
import { cn } from "@/utils/cn";

export interface LocationSearchBarProps {
  onOpenLocationSheet?: () => void;
  className?: string;
}

export function LocationSearchBar({ onOpenLocationSheet, className }: LocationSearchBarProps) {
  const { location, refreshCurrentLocation, isLiveGpsActive } = useCurrentLocation();
  const { query, setQuery, results, isLoading, isOpen, setIsOpen, selectResult, clear } = useLocationSearch();
  const { recents, selectRecent, clearRecents } = useRecentLocations();
  const { places, selectPlace } = useSavedPlaces();

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside pointer click
  useEffect(() => {
    const handleOutsideClick = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, [setIsOpen]);

  const handleSavedPlaceSelect = (place: SavedPlace) => {
    selectPlace(place);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-md pointer-events-auto", className)}>
      {/* Floating Google Maps Style Bar */}
      <div className="flex items-center w-full h-14 bg-white/95 dark:bg-[#121A24]/95 backdrop-blur-md rounded-full shadow-floating px-4 border border-white/40 dark:border-white/10 transition-all focus-within:shadow-modal">
        <Search className="w-5 h-5 text-[#0F4C81] dark:text-[#4C8BF5] shrink-0 mr-3" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={
            location.district
              ? `Search in ${location.district}, village, hospital...`
              : "Search district, village, shelter, hospital..."
          }
          className="w-full bg-transparent border-none text-[#16202A] dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm md:text-base focus:outline-none"
        />

        {query ? (
          <button
            type="button"
            onClick={clear}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white mr-1"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}

        {/* Voice Search Icon */}
        <button
          type="button"
          className="p-2 rounded-full text-[#0F4C81] dark:text-[#4C8BF5] hover:bg-black/5 dark:hover:bg-white/10 transition-colors mr-1"
          title="Voice Search (Hindi / English)"
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Current Location GPS Button */}
        <button
          type="button"
          onClick={() => refreshCurrentLocation()}
          className="p-2 rounded-full text-white bg-[#0F4C81] hover:bg-[#0A365C] dark:bg-[#4C8BF5] dark:text-gray-950 transition-colors shadow-subtle"
          title="Recenter to Current Live GPS Fix"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Autocomplete / Recent Searches Dropdown */}
      {isOpen && (
        <div className="absolute top-16 inset-x-0 bg-white/95 dark:bg-[#121A24]/95 backdrop-blur-md rounded-2xl shadow-modal p-2.5 border border-gray-100 dark:border-gray-800 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[70vh] overflow-y-auto">
          {/* 1. If Loading */}
          {isLoading && <LocationSkeleton />}

          {/* 2. Active Search Results */}
          {!isLoading && results.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-bold text-[#0F4C81] dark:text-[#4C8BF5] uppercase tracking-wider">
                Matching Indian Locations
              </div>
              <div className="space-y-1">
                {results.map((res) => (
                  <SearchResultCard key={res.id} result={res} onSelect={selectResult} />
                ))}
              </div>
            </div>
          )}

          {/* 3. Empty Query: Show Quick Saved Places & Recent Searches */}
          {!isLoading && !query.trim() && (
            <div className="space-y-3">
              {/* Saved Places Quick Strip */}
              {places.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Saved Places
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 no-scrollbar">
                    {places.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSavedPlaceSelect(p)}
                        className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 text-xs font-semibold text-[#16202A] dark:text-white flex items-center gap-1.5 shrink-0 transition-colors"
                      >
                        <Bookmark className="w-3 h-3 text-[#0F4C81] dark:text-[#4C8BF5]" />
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Searches List */}
              {recents.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between px-3 py-1">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearRecents}
                      className="text-[11px] text-gray-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recents.slice(0, 5).map((r) => (
                      <SearchResultCard key={r.id} result={r} onSelect={selectRecent} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-400">
                  Search any village, district, hospital, or shelter across India
                </div>
              )}

              {/* Bottom Sheet Trigger for full place manager */}
              {onOpenLocationSheet && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenLocationSheet();
                  }}
                  className="w-full py-2 text-center text-xs font-bold text-[#0F4C81] dark:text-[#4C8BF5] hover:underline pt-1 border-t border-gray-100 dark:border-gray-800"
                >
                  Manage Saved Locations & Regional Hubs →
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
