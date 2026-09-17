"use client";

import React, { useState } from "react";
import { AlertCircle, Navigation, X } from "lucide-react";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";

export function PermissionBanner() {
  const { permissionStatus, requestPermission } = useCurrentLocation();
  const [isDismissed, setIsDismissed] = useState(false);

  if (permissionStatus !== "denied" || isDismissed) return null;

  return (
    <div className="absolute top-20 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 z-40 bg-amber-50 dark:bg-[#1A2230] border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 px-4 py-2.5 rounded-2xl shadow-floating flex items-center justify-between gap-3 max-w-lg pointer-events-auto select-none animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2.5 text-xs min-w-0">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="truncate">
          Location access disabled. Tap to activate live local early warnings.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => requestPermission()}
          className="px-3 py-1 rounded-full bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0A365C] transition-colors flex items-center gap-1 shadow-subtle"
        >
          <Navigation className="w-3 h-3" />
          Enable
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
