"use client";

import React from "react";
import { Check, X, Layers, Flame, CloudRain, Shield, Building2, Home, AlertOctagon, Camera, Mountain, Droplets, History, Eye } from "lucide-react";
import { TileLayerType } from "./TileProvider";
import { cn } from "@/utils/cn";

// TODO(API)
// ISRO Bhuvan Disaster Services WMS
// TODO(API)
// NASA Landslide LHASA Model
// TODO(API)
// IMD Doppler Radar WMS
// TODO(API)
// NDMA Incident Database

export interface ActiveLayersState {
  basemap: TileLayerType;
  riskHeatmap: boolean;
  weatherRadar: boolean;
  roadClosures: boolean;
  shelters: boolean;
  hospitals: boolean;
  policeStations: boolean;
  fireStations: boolean;
  citizenReports: boolean;
  floodZones: boolean;
  landslideZones: boolean;
  historicalEvents: boolean;
}

export interface LayerSelectorProps {
  layers: ActiveLayersState;
  onChangeLayers: (next: ActiveLayersState) => void;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function LayerSelector({
  layers,
  onChangeLayers,
  isOpen,
  onClose,
  className,
}: LayerSelectorProps) {
  if (!isOpen) return null;

  const toggleLayer = (key: keyof Omit<ActiveLayersState, "basemap">) => {
    onChangeLayers({ ...layers, [key]: !layers[key] });
  };

  const setBasemap = (basemap: TileLayerType) => {
    onChangeLayers({ ...layers, basemap });
  };

  const LAYER_ITEMS: {
    key: keyof Omit<ActiveLayersState, "basemap">;
    label: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    { key: "riskHeatmap", label: "Multi-Hazard Risk Heatmap (40%)", icon: <Flame className="w-4 h-4" />, color: "text-[#D32F2F]" },
    { key: "weatherRadar", label: "Live IMD Weather Radar", icon: <CloudRain className="w-4 h-4" />, color: "text-blue-500" },
    { key: "roadClosures", label: "Road Closures & Blockades", icon: <AlertOctagon className="w-4 h-4" />, color: "text-[#C62828]" },
    { key: "shelters", label: "Emergency Relief Shelters", icon: <Home className="w-4 h-4" />, color: "text-[#2E7D32]" },
    { key: "hospitals", label: "Trauma Centers & Hospitals", icon: <Building2 className="w-4 h-4" />, color: "text-[#D32F2F]" },
    { key: "policeStations", label: "Police Stations & SDRF Units", icon: <Shield className="w-4 h-4" />, color: "text-[#0F4C81]" },
    { key: "fireStations", label: "Fire & Rescue Stations", icon: <Flame className="w-4 h-4" />, color: "text-[#F57C00]" },
    { key: "citizenReports", label: "Live Citizen Reports", icon: <Camera className="w-4 h-4" />, color: "text-purple-600" },
    { key: "floodZones", label: "CWC Floodplains & Inundation", icon: <Droplets className="w-4 h-4" />, color: "text-[#0288D1]" },
    { key: "landslideZones", label: "NASA/GSI Landslide High Zones", icon: <Mountain className="w-4 h-4" />, color: "text-[#6D4C41]" },
    { key: "historicalEvents", label: "Historical Cyclone Tracks", icon: <History className="w-4 h-4" />, color: "text-gray-500" },
  ];

  return (
    <div className={cn("absolute top-20 right-4 w-80 max-h-[80vh] overflow-y-auto bg-white/95 dark:bg-[#121A24]/95 backdrop-blur-md rounded-2xl shadow-modal p-4 border border-gray-100 dark:border-gray-800 z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto", className)}>
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-3">
        <div className="flex items-center gap-2 text-[#0F4C81] dark:text-[#4C8BF5] font-bold text-sm">
          <Layers className="w-4 h-4" />
          <span>GIS Intelligence Overlays</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Basemap Selection */}
      <div className="mb-4">
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
          Basemap Cartography
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {(["voyager", "positron", "satellite", "terrain", "osm", "dark"] as TileLayerType[]).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBasemap(b)}
              className={cn(
                "py-1.5 px-2 rounded-xl text-xs font-semibold capitalize text-center transition-all",
                layers.basemap === b
                  ? "bg-[#0F4C81] text-white shadow-subtle dark:bg-[#4C8BF5] dark:text-gray-950"
                  : "bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
              )}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Overlays List */}
      <div>
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
          Situational Layers
        </div>
        <div className="space-y-1.5">
          {LAYER_ITEMS.map((item) => {
            const active = layers[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleLayer(item.key)}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className={item.color}>{item.icon}</span>
                  <span className="text-xs font-medium text-[#16202A] dark:text-white">
                    {item.label}
                  </span>
                </div>
                <div
                  className={cn(
                    "w-4 h-4 rounded-md flex items-center justify-center transition-colors",
                    active
                      ? "bg-[#0F4C81] text-white dark:bg-[#4C8BF5] dark:text-gray-950"
                      : "border border-gray-300 dark:border-gray-600"
                  )}
                >
                  {active && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
