"use client";

import React from "react";
import { Home, Briefcase, Users, Landmark, Building2, Trash2 } from "lucide-react";
import { SavedPlace } from "@/types/location";

export interface SavedPlaceCardProps {
  place: SavedPlace;
  onSelect: (place: SavedPlace) => void;
  onRemove?: (id: string) => void;
}

export function SavedPlaceCard({ place, onSelect, onRemove }: SavedPlaceCardProps) {
  const getIcon = () => {
    switch (place.type) {
      case "home":
        return <Home className="w-4 h-4 text-[#2E7D32]" />;
      case "work":
        return <Briefcase className="w-4 h-4 text-[#0F4C81] dark:text-[#4C8BF5]" />;
      case "family":
        return <Users className="w-4 h-4 text-purple-600" />;
      case "shelter":
        return <Landmark className="w-4 h-4 text-[#2E7D32]" />;
      case "hospital":
        return <Building2 className="w-4 h-4 text-[#D32F2F]" />;
      default:
        return <Home className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div
      onClick={() => onSelect(place)}
      className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800/80 cursor-pointer transition-colors select-none group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
          {getIcon()}
        </div>
        <div className="min-w-0">
          <span className="text-sm font-bold text-[#16202A] dark:text-white truncate block">
            {place.label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
            {place.location.formattedAddress}
          </span>
          {place.notes && (
            <span className="text-[11px] text-gray-400 italic block mt-0.5">
              {place.notes}
            </span>
          )}
        </div>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(place.id);
          }}
          className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
          title="Remove saved place"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
