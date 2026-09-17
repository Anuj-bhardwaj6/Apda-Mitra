"use client";

import React, { useState } from "react";
import { Info, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

export function MapLegend({ className }: { className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const LEGEND_ITEMS = [
    { label: "Relief Shelter (Open)", color: "#2E7D32" },
    { label: "Trauma Hospital", color: "#D32F2F" },
    { label: "Road Closed / Blocked", color: "#C62828" },
    { label: "Police / SDRF Post", color: "#0F4C81" },
    { label: "Fire & Rescue Station", color: "#F57C00" },
    { label: "Citizen Field Report", color: "#7B1FA2" },
    { label: "Cyclone Surge (Red)", color: "#D32F2F" },
    { label: "Floodplain Inundation", color: "#0288D1" },
  ];

  return (
    <div
      className={cn(
        "bg-white/95 dark:bg-[#121A24]/95 backdrop-blur-md rounded-2xl shadow-floating border border-white/40 dark:border-white/10 p-2.5 pointer-events-auto transition-all duration-200 select-none",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 text-xs font-bold text-[#0F4C81] dark:text-[#4C8BF5] px-1"
      >
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Map Legend
        </span>
        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {isExpanded && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2.5 mt-1 border-t border-gray-100 dark:border-gray-800">
          {LEGEND_ITEMS.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[11px] text-gray-700 dark:text-gray-300">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
