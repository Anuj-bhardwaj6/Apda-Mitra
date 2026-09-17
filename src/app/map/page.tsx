"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Layers, Shield, Crosshair, MapPin } from "lucide-react";
import { GovHeader } from "@/components/common/GovHeader";
import { InteractiveMapWrapper } from "@/features/map/InteractiveMapWrapper";
import type { MapPointItem } from "@/features/map/GoogleStyleMap";
import { SIMULATION_SCENARIOS } from "@/services/simulation.service";
import { TARGET_REGION_CENTER, TARGET_REGION_BBOX } from "@/constants/targetRegion";

export default function DedicatedMapPage() {
  const [currentCoords, setCurrentCoords] = useState<[number, number]>(TARGET_REGION_CENTER);
  const [locationName, setLocationName] = useState("All 10 States");

  // Sample points with hazards and shelters
  const scenario = SIMULATION_SCENARIOS.landslide_warning;
  const mapPoints: MapPointItem[] = [
    ...scenario.shelters.map((sh) => ({
      id: sh.id,
      type: sh.category as any,
      title: sh.name,
      subtitle: `${sh.distanceKm} km • ${sh.capacity || "Verified Shelter"}`,
      lat: sh.lat,
      lng: sh.lng,
      severity: "Green" as const,
    })),
    ...scenario.hazardsOnMap.map((hz) => ({
      id: hz.id,
      type: hz.type,
      title: hz.title,
      subtitle: hz.description,
      lat: hz.lat,
      lng: hz.lng,
      severity: hz.severity as any,
      polygon: hz.polygon,
    })),
  ];

  return (
    <div className="h-screen flex flex-col bg-[#F6F8FA] overflow-hidden">
      <GovHeader currentLocationName={locationName} />

      {/* Floating Header Toolbar */}
      <div className="px-4 py-2 bg-white/90 backdrop-blur-md border-b border-[#E4E7EC] flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F4C81] hover:underline px-3 py-1.5 rounded-full bg-[#F6F8FA] border border-[#E4E7EC]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
            <span className="font-bold text-[#16202A]">Spatial Early Warning GIS</span>
            <span className="text-[#5F6D7E]">| ISRO Bhuvan & IMD Radar Telemetry</span>
          </div>
        </div>

        <span className="text-xs font-bold text-[#0F4C81] px-3 py-1 rounded-full bg-[#E8F1F8]">
          📍 {locationName}
        </span>
      </div>

      {/* Full-Screen GIS Map Viewport */}
      <div className="flex-1 relative w-full h-full">
        <InteractiveMapWrapper
          userCoords={currentCoords}
          points={mapPoints}
          lang="en"
          onSearchSelect={(coords, name) => {
            setCurrentCoords(coords);
            setLocationName(name.split(",")[0]);
          }}
        />
      </div>
    </div>
  );
}
