'use client';

import React, { useState } from 'react';
import { MapPin, Navigation2, RefreshCw } from 'lucide-react';

interface LocationPillProps {
  locationName: string;
  updatedAgo: string;
  onOpenSearch: () => void;
  onRefreshGPS: () => void;
  lang: 'en' | 'hi';
}

export const LocationPill: React.FC<LocationPillProps> = ({
  locationName,
  updatedAgo,
  onOpenSearch,
  onRefreshGPS,
  lang,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    onRefreshGPS();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="w-full">
      <div
        onClick={onOpenSearch}
        className="w-full bg-white dark:bg-[#131D2A] border border-[#E2E8F0] dark:border-[#24344B] rounded-2xl p-3 sm:p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
      >
        {/* Left: Location Pin & District Name */}
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-[#EBF3FA] dark:bg-[#1B2738] flex items-center justify-center text-[#0F4C81] dark:text-[#81D4FA] shrink-0 group-hover:scale-105 transition-transform">
            <MapPin className="w-5 h-5" />
          </div>

          <div className="truncate">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                {lang === 'hi' ? '📍 आपका वर्तमान स्थान' : '📍 Current Location'}
              </span>
              <span className="text-[10px] text-[#2E7D32] bg-[#E8F5E9] dark:bg-[#1A3320] px-2 py-0.2 rounded-full font-bold">
                {lang === 'hi' ? 'जीपीएस सक्रिय' : 'GPS Active'}
              </span>
            </div>

            <h2 className="text-sm sm:text-base font-bold text-[#1F2937] dark:text-white truncate mt-0.5">
              {locationName}
            </h2>
          </div>
        </div>

        {/* Right: Freshness Timestamp & Refresh Button */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] hidden xs:inline">
            {updatedAgo}
          </span>
          <button
            onClick={handleRefresh}
            className="w-9 h-9 rounded-xl bg-[#F8FAFC] dark:bg-[#1B2738] hover:bg-[#F1F5F9] text-[#4B5563] dark:text-[#CBD5E1] flex items-center justify-center border border-[#E2E8F0] dark:border-[#24344B] transition-all cursor-pointer"
            title="Refresh GPS / स्थान अद्यतन करें"
            aria-label="Refresh GPS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0F4C81]' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
