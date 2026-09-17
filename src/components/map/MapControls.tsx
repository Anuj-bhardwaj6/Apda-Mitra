"use client";

import React from "react";
import { Plus, Minus, Navigation2, Maximize2, Minimize2, Layers, Compass } from "lucide-react";
import { cn } from "@/utils/cn";

export interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocateMe: () => void;
  onToggleFullscreen: () => void;
  onToggleLayers: () => void;
  onResetNorth: () => void;
  isFullscreen?: boolean;
  isLocating?: boolean;
  isLayersOpen?: boolean;
  className?: string;
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  onLocateMe,
  onToggleFullscreen,
  onToggleLayers,
  onResetNorth,
  isFullscreen = false,
  isLocating = false,
  isLayersOpen = false,
  className,
}: MapControlsProps) {
  // 56px rounded glassmorphism button style
  const buttonStyle =
    "w-14 h-14 rounded-full bg-white/95 dark:bg-[#121A24]/95 backdrop-blur-md text-[#0F4C81] dark:text-[#4C8BF5] shadow-floating flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 border border-white/40 dark:border-white/10 select-none";

  return (
    <div className={cn("flex flex-col gap-3 pointer-events-auto", className)}>
      {/* 1. Reset North Compass Button */}
      <button
        type="button"
        onClick={onResetNorth}
        className={buttonStyle}
        title="Reset North Orientation"
        aria-label="Reset North"
      >
        <Compass className="w-6 h-6 stroke-[2.2] text-[#0F4C81] dark:text-[#4C8BF5]" />
      </button>

      {/* 2. Layer Switcher Drawer Button */}
      <button
        type="button"
        onClick={onToggleLayers}
        className={cn(
          buttonStyle,
          isLayersOpen && "bg-[#0F4C81] text-white dark:bg-[#4C8BF5] dark:text-gray-950"
        )}
        title="GIS Intelligence Layers"
        aria-label="GIS Layers"
      >
        <Layers className="w-6 h-6 stroke-[2.2]" />
      </button>

      {/* 3. Locate Me / Live GPS Button */}
      <button
        type="button"
        onClick={onLocateMe}
        className={cn(
          buttonStyle,
          isLocating && "ring-2 ring-blue-500 ring-offset-2 animate-pulse"
        )}
        title="Locate Current Position"
        aria-label="Locate Me"
      >
        <Navigation2 className={cn("w-6 h-6 stroke-[2.2]", isLocating ? "text-blue-500 fill-blue-500/20" : "")} />
      </button>

      {/* 4. Zoom Group (Zoom In / Zoom Out) */}
      <div className="flex flex-col bg-white/95 dark:bg-[#121A24]/95 backdrop-blur-md rounded-full shadow-floating overflow-hidden border border-white/40 dark:border-white/10">
        <button
          type="button"
          onClick={onZoomIn}
          className="w-14 h-12 flex items-center justify-center text-[#0F4C81] dark:text-[#4C8BF5] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-colors"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
        <div className="w-8 h-[1px] bg-gray-200 dark:bg-gray-700 mx-auto" />
        <button
          type="button"
          onClick={onZoomOut}
          className="w-14 h-12 flex items-center justify-center text-[#0F4C81] dark:text-[#4C8BF5] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-colors"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <Minus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* 5. Fullscreen Toggle Button */}
      <button
        type="button"
        onClick={onToggleFullscreen}
        className={buttonStyle}
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen GIS Mode"}
        aria-label="Toggle Fullscreen"
      >
        {isFullscreen ? <Minimize2 className="w-5 h-5 stroke-[2.2]" /> : <Maximize2 className="w-5 h-5 stroke-[2.2]" />}
      </button>
    </div>
  );
}
