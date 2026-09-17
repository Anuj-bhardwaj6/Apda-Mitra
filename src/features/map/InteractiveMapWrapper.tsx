"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { MapPointItem, MapMarkerItem } from "./GoogleStyleMap";
import { Language } from "@/constants/localization";

const DynamicGoogleStyleMap = dynamic(
  () => import("./GoogleStyleMap").then((mod) => mod.GoogleStyleMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-[#F7F8FA] rounded-3xl border border-[#E4E7EC]">
        <div className="w-10 h-10 rounded-full border-4 border-[#0F4C81] border-t-transparent animate-spin mb-3" />
        <p className="text-sm font-bold text-[#0F4C81]">Loading Apda Mitra Spatial Map...</p>
        <span className="text-xs text-[#5F6D7E] mt-1">OpenStreetMap & GSI Topography</span>
      </div>
    ),
  }
);

interface InteractiveMapWrapperProps {
  userCoords?: [number, number];
  evacuationRoute?: [number, number][] | null;
  selectedMarker?: MapPointItem | null;
  onSelectMarker?: (marker: MapPointItem) => void;
  points?: MapPointItem[];
  lang?: Language;
  className?: string;
  onSearchSelect?: (coords: [number, number], name: string) => void;
  targetBounds?: [[number, number], [number, number]] | null;
  isAllStates?: boolean;
  riskOverlayAvailable?: boolean;
}

export function InteractiveMapWrapper(props: InteractiveMapWrapperProps) {
  return <DynamicGoogleStyleMap {...props} />;
}
