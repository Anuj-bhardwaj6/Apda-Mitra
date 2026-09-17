"use client";

import React, { useEffect, useState } from "react";
import L from "leaflet";
import { cn } from "@/utils/cn";

export function MapScale({ map, className }: { map: L.Map | null; className?: string }) {
  const [scaleText, setScaleText] = useState("2 km");
  const [scaleWidthPx, setScaleWidthPx] = useState(60);

  useEffect(() => {
    if (!map) return;

    const updateScale = () => {
      const zoom = map.getZoom();
      // Distance per 60 pixels at current latitude
      const lat = map.getCenter().lat;
      const metersPerPx = (40075016.686 * Math.abs(Math.cos((lat * Math.PI) / 180))) / Math.pow(2, zoom + 8);
      const targetMeters = metersPerPx * 60;

      if (targetMeters < 1000) {
        const roundedM = Math.round(targetMeters / 50) * 50 || 50;
        setScaleText(`${roundedM} m`);
        setScaleWidthPx(Math.max(35, Math.min(80, (roundedM / metersPerPx))));
      } else {
        const roundedKm = Math.round((targetMeters / 1000) * 2) / 2 || 1;
        setScaleText(`${roundedKm} km`);
        setScaleWidthPx(Math.max(35, Math.min(80, ((roundedKm * 1000) / metersPerPx))));
      }
    };

    updateScale();
    map.on("zoomend", updateScale);
    map.on("moveend", updateScale);

    return () => {
      map.off("zoomend", updateScale);
      map.off("moveend", updateScale);
    };
  }, [map]);

  return (
    <div
      className={cn(
        "bg-white/80 dark:bg-[#121A24]/80 backdrop-blur-md px-2 py-0.5 rounded-md shadow-subtle border border-black/5 dark:border-white/10 select-none pointer-events-none flex flex-col items-center",
        className
      )}
    >
      <span className="text-[10px] font-bold text-[#0F4C81] dark:text-[#4C8BF5] leading-none mb-0.5">
        {scaleText}
      </span>
      <div
        className="h-1 border-b-2 border-l-2 border-r-2 border-[#0F4C81] dark:border-[#4C8BF5]"
        style={{ width: `${scaleWidthPx}px` }}
      />
    </div>
  );
}
