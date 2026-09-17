"use client";

import React from "react";
import dynamic from "next/dynamic";
import { InteractiveMapProps } from "./InteractiveMap";

const DynamicMap = dynamic(
  () => import("./InteractiveMap").then((mod) => mod.InteractiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#E5EBF0] dark:bg-[#0B111A] min-h-[450px]">
        <div className="w-12 h-12 rounded-full border-4 border-[#0F4C81] border-t-transparent animate-spin mb-3" />
        <p className="text-sm font-bold text-[#0F4C81] dark:text-[#4C8BF5]">
          Initializing National GIS Intelligence Engine...
        </p>
        <span className="text-xs text-gray-500 mt-1">
          OpenStreetMap • CartoDB Voyager • ISRO Bhuvan Spatial Feed
        </span>
      </div>
    ),
  }
);

export function InteractiveMapWrapper(props: InteractiveMapProps) {
  return <DynamicMap {...props} />;
}
