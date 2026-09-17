"use client";

import React from "react";
import { History, MapPin, ChevronRight } from "lucide-react";
import { GeocodedResult } from "@/types/location";
import { formatDistance } from "@/utils/formatters";

export interface RecentLocationCardProps {
  item: GeocodedResult;
  onSelect: (item: GeocodedResult) => void;
}

export function RecentLocationCard({ item, onSelect }: RecentLocationCardProps) {
  return (
    <div
      onClick={() => onSelect(item)}
      className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800/80 cursor-pointer transition-colors select-none"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center shrink-0">
          <History className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-sm font-semibold text-[#16202A] dark:text-white truncate block">
            {item.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
            {item.district}, {item.state}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.distanceMeters !== undefined && (
          <span className="text-xs font-semibold text-gray-400">
            {formatDistance(item.distanceMeters)}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </div>
  );
}
