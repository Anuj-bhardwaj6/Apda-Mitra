"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, Mic, Navigation, MapPin, Building2, Home, Shield } from "lucide-react";
import { GeocodingService } from "@/services/geocoding.service";
import { GeocodedResult } from "@/types/location";
import { cn } from "@/utils/cn";

// TODO(API)
// Photon Autocomplete Engine
// TODO(API)
// Nominatim Reverse Geocoding

export interface MapSearchBarProps {
  onSelectLocation: (loc: GeocodedResult) => void;
  onLocateMe: () => void;
  userDistrict?: string;
  className?: string;
}

export function MapSearchBar({
  onSelectLocation,
  onLocateMe,
  userDistrict,
  className,
}: MapSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodedResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const data = await GeocodingService.autocomplete(query);
      setResults(data);
      setIsOpen(data.length > 0);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleSelect = (loc: GeocodedResult) => {
    setQuery(loc.name);
    setIsOpen(false);
    onSelectLocation(loc);
  };

  const getCategoryIcon = (cat: GeocodedResult["category"]) => {
    switch (cat) {
      case "hospital":
        return <Building2 className="w-4 h-4 text-[#D32F2F] shrink-0" />;
      case "shelter":
        return <Home className="w-4 h-4 text-[#2E7D32] shrink-0" />;
      default:
        return <MapPin className="w-4 h-4 text-gray-500 shrink-0" />;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-md pointer-events-auto", className)}>
      <div className="flex items-center w-full h-14 bg-white/95 dark:bg-[#121A24]/95 backdrop-blur-md rounded-full shadow-floating px-4 border border-white/40 dark:border-white/10 transition-all focus-within:shadow-modal">
        <Search className="w-5 h-5 text-[#0F4C81] dark:text-[#4C8BF5] shrink-0 mr-3" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={userDistrict ? `Search in ${userDistrict}, village, shelter...` : "Search district, village, hospital, shelter..."}
          className="w-full bg-transparent border-none text-[#16202A] dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm md:text-base focus:outline-none"
        />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white mr-1"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}

        {/* Voice Search Placeholder Icon */}
        <button
          type="button"
          className="p-2 rounded-full text-[#0F4C81] dark:text-[#4C8BF5] hover:bg-black/5 dark:hover:bg-white/10 transition-colors mr-1"
          title="Voice Search (Hindi / English)"
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Locate Me Current Position Icon */}
        <button
          type="button"
          onClick={onLocateMe}
          className="p-2 rounded-full text-white bg-[#0F4C81] hover:bg-[#0A365C] dark:bg-[#4C8BF5] dark:text-gray-950 transition-colors shadow-subtle"
          title="Fly to My Current Location"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-16 inset-x-0 bg-white/95 dark:bg-[#121A24]/95 backdrop-blur-md rounded-2xl shadow-modal p-2 border border-gray-100 dark:border-gray-800 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[11px] font-bold text-[#0F4C81] dark:text-[#4C8BF5] uppercase tracking-wider">
            Verified Emergency Locations
          </div>
          <div className="space-y-1">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/80 text-left transition-colors"
              >
                <div className="mt-0.5">{getCategoryIcon(item.category)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#16202A] dark:text-white truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {item.formattedAddress}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
