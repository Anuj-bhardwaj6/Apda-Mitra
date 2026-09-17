"use client";

import React from "react";
import { WifiOff, PhoneCall, CheckCircle } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-900 text-white px-4 py-2 text-xs md:text-sm flex flex-wrap items-center justify-between gap-2 shadow-elevation border-b border-amber-800 z-50">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
        <span className="font-semibold">Offline Mode Active:</span>
        <span className="text-amber-100">
          Showing cached emergency shelter locations and offline protocols.
        </span>
      </div>
      <div className="flex items-center gap-3 font-medium">
        <span className="inline-flex items-center gap-1 text-amber-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          Offline Helplines Ready
        </span>
        <a
          href="tel:112"
          className="inline-flex items-center gap-1 bg-white text-gray-900 font-bold px-3 py-1 rounded-pill text-xs hover:bg-amber-50"
        >
          <PhoneCall className="w-3 h-3 text-red-600" />
          Call 112 (Cellular)
        </a>
      </div>
    </div>
  );
}
