"use client";

import React from "react";
import { MapPin, Building2, Home, History, Bookmark, Navigation } from "lucide-react";
import { GeocodedResult } from "@/types/location";
import { formatDistance } from "@/utils/formatters";
import { cn } from "@/utils/cn";

export interface SearchResultCardProps {
  result: GeocodedResult;
  onSelect: (result: GeocodedResult) => void;
  className?: string;
}

export function SearchResultCard({ result, onSelect, className }: SearchResultCardProps) {
  const getIcon = () => {
    switch (result.category) {
      case "hospital":
        return <Building2 className="w-4 h-4 text-[#D32F2F]" />;
      case "shelter":
        return <Home className="w-4 h-4 text-[#2E7D32]" />;
      default:
        return <MapPin className="w-4 h-4 text-[#0F4C81] dark:text-[#4C8BF5]" />;
    }
  };

  return (
    <div
      onClick={() => onSelect(result)}
      className={cn(
        "flex items-center justify-between p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800/80 cursor-pointer transition-colors group select-none",
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
          {getIcon()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-[#16202A] dark:text-white truncate">
              {result.name}
            </span>
            {result.isRecent && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <History className="w-2.5 h-2.5" /> Recent
              </span>
            )}
            {result.isSaved && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#0F4C81] dark:bg-blue-950 dark:text-blue-300">
                <Bookmark className="w-2.5 h-2.5" /> Saved
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {result.district}, {result.state} • {result.country}
          </p>
        </div>
      </div>

      {result.distanceMeters !== undefined && (
        <div className="shrink-0 text-right pl-3">
          <span className="text-xs font-bold text-[#0F4C81] dark:text-[#4C8BF5] block">
            {formatDistance(result.distanceMeters)}
          </span>
          <span className="text-[10px] text-gray-400">away</span>
        </div>
      )}
    </div>
  );
}
