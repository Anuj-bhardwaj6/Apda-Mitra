"use client";

import React, { useState, useEffect } from "react";
import { X, Navigation, Bookmark, History, Plus, MapPin, Check } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { SavedPlaceCard } from "./SavedPlaceCard";
import { RecentLocationCard } from "./RecentLocationCard";
import { SearchResultCard } from "./SearchResultCard";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";
import { useRecentLocations } from "@/hooks/useRecentLocations";
import { PlacesService } from "@/services/places.service";
import { GeocodedResult, SavedPlaceType } from "@/types/location";
import { cn } from "@/utils/cn";

export interface LocationBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationBottomSheet({ isOpen, onClose }: LocationBottomSheetProps) {
  const { location, refreshCurrentLocation, setLocationFromCoordinates } = useCurrentLocation();
  const { places, addPlace, removePlace, selectPlace } = useSavedPlaces();
  const { recents, selectRecent, clearRecents } = useRecentLocations();

  const [activeTab, setActiveTab] = useState<"current" | "saved" | "recents">("current");
  const [popularHubs, setPopularHubs] = useState<GeocodedResult[]>([]);
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [saveType, setSaveType] = useState<SavedPlaceType>("home");

  useEffect(() => {
    PlacesService.getPopularDisasterHubs().then(setPopularHubs);
  }, []);

  const handleSaveCurrentLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveLabel.trim()) return;
    addPlace(saveLabel.trim(), saveType, location);
    setSaveLabel("");
    setIsSavingCurrent(false);
  };

  const handleSelectResult = (res: GeocodedResult) => {
    setLocationFromCoordinates(res.latitude, res.longitude, "search");
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Location Intelligence & Places"
      subtitle={`Active: ${location.formattedAddress}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="flex rounded-2xl bg-gray-100 dark:bg-gray-800 p-1">
          {[
            { id: "current" as const, label: "Current & Hubs", icon: Navigation },
            { id: "saved" as const, label: `Saved (${places.length})`, icon: Bookmark },
            { id: "recents" as const, label: `Recents (${recents.length})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                  active
                    ? "bg-white dark:bg-[#121A24] text-[#0F4C81] dark:text-[#4C8BF5] shadow-subtle"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Current Location & Popular Hubs */}
        {activeTab === "current" && (
          <div className="space-y-4">
            {/* Active GPS Hero Card */}
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <span className="text-[11px] font-bold text-[#0F4C81] dark:text-[#4C8BF5] uppercase tracking-wider block">
                  Active Coordinates Fix
                </span>
                <div className="text-sm font-bold text-[#16202A] dark:text-white truncate">
                  {location.formattedAddress}
                </div>
                <span className="text-xs text-gray-500">
                  {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E • Source: {location.source.toUpperCase()}
                </span>
              </div>
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Navigation className="w-3.5 h-3.5" />}
                onClick={() => {
                  refreshCurrentLocation();
                  onClose();
                }}
              >
                Recenter GPS
              </Button>
            </div>

            {/* Popular Disaster Hubs */}
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Active National Disaster Hotspots (NDMA Monitored)
              </div>
              <div className="space-y-1">
                {popularHubs.map((hub) => (
                  <SearchResultCard key={hub.id} result={hub} onSelect={handleSelectResult} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Saved Places */}
        {activeTab === "saved" && (
          <div className="space-y-4">
            {/* Save Current Location Form */}
            {isSavingCurrent ? (
              <form onSubmit={handleSaveCurrentLocation} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 space-y-3">
                <div className="text-xs font-bold text-[#0F4C81] dark:text-[#4C8BF5] uppercase">
                  Bookmark Current Location
                </div>
                <input
                  type="text"
                  placeholder="e.g. My Home, Sister's House, Farm"
                  value={saveLabel}
                  onChange={(e) => setSaveLabel(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(["home", "work", "family", "village", "shelter"] as SavedPlaceType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSaveType(t)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold capitalize",
                        saveType === t
                          ? "bg-[#0F4C81] text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setIsSavingCurrent(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" variant="primary">
                    Save Place
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsSavingCurrent(true)}
              >
                Bookmark Current Location
              </Button>
            )}

            {/* Saved Places List */}
            <div className="space-y-1">
              {places.map((place) => (
                <SavedPlaceCard
                  key={place.id}
                  place={place}
                  onSelect={(p) => {
                    selectPlace(p);
                    onClose();
                  }}
                  onRemove={removePlace}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Recent Searches */}
        {activeTab === "recents" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Recent Locations History
              </span>
              {recents.length > 0 && (
                <button
                  type="button"
                  onClick={clearRecents}
                  className="text-xs text-red-600 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {recents.length > 0 ? (
              <div className="space-y-1">
                {recents.map((item) => (
                  <RecentLocationCard
                    key={item.id}
                    item={item}
                    onSelect={(r) => {
                      selectRecent(r);
                      onClose();
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-gray-400">
                No recent searches logged on this device.
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
