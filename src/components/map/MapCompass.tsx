"use client";

import React from "react";
import { Compass } from "lucide-react";
import { cn } from "@/utils/cn";

export interface MapCompassProps {
  headingDegrees?: number;
  onResetNorth: () => void;
  className?: string;
}

export function MapCompass({
  headingDegrees = 0,
  onResetNorth,
  className,
}: MapCompassProps) {
  return (
    <button
      type="button"
      onClick={onResetNorth}
      className={cn(
        "w-11 h-11 rounded-full bg-white/95 dark:bg-[#121A24]/95 backdrop-blur-md text-[#0F4C81] dark:text-[#4C8BF5] shadow-floating flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-white/40 dark:border-white/10 pointer-events-auto",
        className
      )}
      title="Reset North Orientation"
      aria-label="Compass"
    >
      <div
        className="transition-transform duration-300 flex items-center justify-center"
        style={{ transform: `rotate(${headingDegrees}deg)` }}
      >
        <Compass className="w-5 h-5 stroke-[2.2]" />
      </div>
    </button>
  );
}
