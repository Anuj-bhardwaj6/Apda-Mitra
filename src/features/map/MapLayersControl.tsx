"use client";

import React from "react";
import { Layers, Eye, Check } from "lucide-react";
import { cn } from "@/utils/cn";

export interface MapLayersState {
  showShelters: boolean;
  showHospitals: boolean;
  showFloods: boolean;
  showCycloneTrack: boolean;
  showNdrfUnits: boolean;
  basemap: "standard" | "satellite" | "terrain";
}

export interface MapLayersControlProps {
  layers: MapLayersState;
  onChangeLayers: (next: MapLayersState) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export function MapLayersControl({
  layers,
  onChangeLayers,
  isOpen,
  onToggleOpen,
}: MapLayersControlProps) {
  const toggleKey = (key: keyof Omit<MapLayersState, "basemap">) => {
    onChangeLayers({
      ...layers,
      [key]: !layers[key],
    });
  };

  const setBasemap = (basemap: MapLayersState["basemap"]) => {
    onChangeLayers({ ...layers, basemap });
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex items-center gap-2 px-3.5 py-2.5 bg-gov-surface dark:bg-gov-darkSurface text-gov-text dark:text-white rounded-btn shadow-elevation hover:bg-gov-primaryLight/50 transition-all text-xs font-semibold"
        title="Toggle GIS Layers"
      >
        <Layers className="w-4 h-4 text-gov-primary dark:text-gov-accent" />
        <span className="hidden sm:inline">GIS Layers</span>
      </button>

      {/* Layer Options Popover */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-64 bg-gov-surface dark:bg-gov-darkSurface rounded-card shadow-modal p-4 z-40 border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95">
          <div className="text-xs font-bold text-gov-primary uppercase tracking-wider mb-2">
            Basemap Cartography
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            {(["standard", "satellite", "terrain"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBasemap(b)}
                className={cn(
                  "py-1.5 px-2 rounded-btn text-xs capitalize transition-colors font-medium text-center",
                  layers.basemap === b
                    ? "bg-gov-primary text-white font-bold"
                    : "bg-gray-100 dark:bg-gray-800 text-gov-text dark:text-gray-300 hover:bg-gray-200"
                )}
              >
                {b}
              </button>
            ))}
          </div>

          <div className="text-xs font-bold text-gov-primary uppercase tracking-wider mb-2">
            Disaster Intelligence Overlays
          </div>
          <div className="space-y-2">
            {[
              { key: "showCycloneTrack" as const, label: "Cyclone Track & Wind Cone" },
              { key: "showFloods" as const, label: "CWC Inundation Floodplains" },
              { key: "showShelters" as const, label: "Designated Relief Shelters" },
              { key: "showHospitals" as const, label: "Trauma & District Hospitals" },
              { key: "showNdrfUnits" as const, label: "NDRF Deployment Bases" },
            ].map((item) => {
              const active = layers[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleKey(item.key)}
                  className="w-full flex items-center justify-between p-2 rounded-btn hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
                >
                  <span className="text-xs font-medium text-gov-text dark:text-gray-200">
                    {item.label}
                  </span>
                  <div
                    className={cn(
                      "w-4 h-4 rounded flex items-center justify-center transition-colors",
                      active ? "bg-gov-primary text-white" : "border border-gray-300 dark:border-gray-600"
                    )}
                  >
                    {active && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
