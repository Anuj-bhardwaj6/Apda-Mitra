"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, ShieldCheck, PhoneCall } from "lucide-react";

// TODO(API)
// PWA Cache & Service Worker Offline Tile Storage

export function MapOfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="absolute top-20 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 z-40 bg-[#16202A]/95 text-white backdrop-blur-md px-4 py-2 rounded-2xl shadow-modal flex items-center justify-between gap-3 border border-amber-500/40 pointer-events-auto max-w-lg animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 text-xs">
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
        <div>
          <span className="font-bold text-amber-300">Offline GIS Mode:</span> Cached map tiles active. Live GPS position tracking remains fully operational.
        </div>
      </div>
      <a
        href="tel:112"
        className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 flex items-center gap-1"
      >
        <PhoneCall className="w-3 h-3" />
        112
      </a>
    </div>
  );
}
