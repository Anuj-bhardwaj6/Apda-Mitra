"use client";

import React from "react";
import { SearchBar } from "@/components/ui/SearchBar";
import { ShieldAlert } from "lucide-react";

export interface MobileFloatingSearchProps {
  onSearch: (q: string) => void;
  onLocateMe: () => void;
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
  activeAlertHeadline?: string;
}

export function MobileFloatingSearch({
  onSearch,
  onLocateMe,
  selectedFilter,
  onSelectFilter,
  activeAlertHeadline = "IMD Red Alert: Cyclone DANA Landfall Corridor Active",
}: MobileFloatingSearchProps) {
  const filters = [
    { id: "all", label: "All Hazards" },
    { id: "cyclone", label: "Cyclone" },
    { id: "flood", label: "Floods" },
    { id: "shelter", label: "Shelters" },
    { id: "hospital", label: "Hospitals" },
  ];

  return (
    <div className="absolute top-3 inset-x-3 z-30 flex flex-col gap-2 md:hidden pointer-events-auto">
      {/* Floating Search Bar */}
      <SearchBar
        placeholder="Search shelters, flood zones..."
        onSearch={onSearch}
        onLocateMe={onLocateMe}
      />

      {/* Live Warning Ticker Chip */}
      <div className="flex items-center gap-2 bg-gov-danger text-white px-3.5 py-1.5 rounded-pill shadow-elevation text-xs font-semibold overflow-hidden">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 animate-pulse text-amber-200" />
        <span className="truncate">{activeAlertHeadline}</span>
      </div>

      {/* Horizontal Filter Scroll */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {filters.map((f) => {
          const isSelected = selectedFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFilter(f.id)}
              className={`px-3 py-1 rounded-pill text-xs font-semibold whitespace-nowrap shadow-subtle transition-colors ${
                isSelected
                  ? "bg-gov-primary text-white"
                  : "bg-gov-surface/90 dark:bg-gov-darkSurface text-gov-text dark:text-gray-200"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
