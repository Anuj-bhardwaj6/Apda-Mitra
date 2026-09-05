'use client';

import React, { useState } from 'react';
import { MapPin, Navigation2, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';

interface LocationPillProps {
  locationName: string;
  updatedAgo: string;
  elevationMeters?: number;
  latitude?: number;
  longitude?: number;
  isGpsActive?: boolean;
  isFallback?: boolean;
  status?: 'prompt' | 'detecting' | 'active' | 'denied' | 'unavailable' | 'unsupported' | 'manual' | 'timeout';
  permissionState?: 'prompt' | 'granted' | 'denied' | 'unknown';
  onOpenSearch: () => void;
  onRefreshGPS: () => void;
  lang: 'en' | 'hi';
}

export const LocationPill: React.FC<LocationPillProps> = ({
  locationName,
  updatedAgo,
  elevationMeters,
  latitude,
  longitude,
  isGpsActive = false,
  isFallback = false,
  status = 'prompt',
  permissionState = 'unknown',
  onOpenSearch,
  onRefreshGPS,
  lang,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    onRefreshGPS();
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  return (
    <div className="w-full space-y-2">
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
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                {lang === 'hi' ? '📍 वर्तमान स्थान' : '📍 Current Location'}
              </span>

              {/* Status Indicators: Prompt / Detecting / GPS Active / Fallback */}
              {status === 'prompt' ? (
                <span className="inline-flex items-center space-x-1 text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2 py-0.2 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                  <span>{lang === 'hi' ? 'अनुमति प्रतीक्षित' : 'Permission Needed'}</span>
                </span>
              ) : status === 'detecting' || isRefreshing ? (
                <span className="inline-flex items-center space-x-1 text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2 py-0.2 rounded-full font-bold">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span>{lang === 'hi' ? 'जीपीएस खोज रहे हैं...' : 'Acquiring GPS...'}</span>
                </span>
              ) : isGpsActive ? (
                <span className="inline-flex items-center space-x-1 text-[10px] text-[#2E7D32] dark:text-[#81C784] bg-[#E8F5E9] dark:bg-[#1A3320] border border-[#A5D6A7]/50 dark:border-[#2E7D32]/50 px-2 py-0.2 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] dark:bg-[#81C784] animate-pulse" />
                  <span>{lang === 'hi' ? 'जीपीएस सक्रिय' : 'GPS Active'}</span>
                </span>
              ) : isFallback ? (
                <span className="inline-flex items-center space-x-1 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.2 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>
                    {status === 'denied'
                      ? (lang === 'hi' ? 'जीपीएस अस्वीकृत (फ़ॉलबैक)' : 'GPS Denied (Fallback)')
                      : status === 'timeout'
                      ? (lang === 'hi' ? 'जीपीएस समय समाप्त (फ़ॉलबैक)' : 'GPS Timeout (Fallback)')
                      : (lang === 'hi' ? 'फ़ॉलबैक स्थान' : 'Fallback Location')}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 text-[10px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.2 rounded-full font-bold">
                  <span>{lang === 'hi' ? 'चयनित स्थान' : 'Selected Location'}</span>
                </span>
              )}

              {elevationMeters !== undefined && (
                <span className="text-[10px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.2 rounded-full font-semibold border border-slate-200 dark:border-slate-700">
                  ⛰️ {elevationMeters.toLocaleString()}m
                </span>
              )}
            </div>

            <h2 className="text-sm sm:text-base font-bold text-[#1F2937] dark:text-white truncate mt-0.5">
              {locationName}
            </h2>

            {latitude !== undefined && longitude !== undefined ? (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium block">
                {latitude >= 0 ? `${latitude.toFixed(4)}°N` : `${Math.abs(latitude).toFixed(4)}°S`},{' '}
                {longitude >= 0 ? `${longitude.toFixed(4)}°E` : `${Math.abs(longitude).toFixed(4)}°W`}
              </span>
            ) : (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium block">
                {status === 'prompt'
                  ? (lang === 'hi' ? 'स्थान अनुमति की प्रतीक्षा कर रहे हैं...' : 'Waiting for location permission...')
                  : (lang === 'hi' ? 'जीपीएस निर्देशांक खोज रहे हैं...' : 'Acquiring GPS coordinates...')}
              </span>
            )}
          </div>
        </div>

        {/* Right: Freshness Timestamp & Refresh Button */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] hidden xs:inline">
            {updatedAgo}
          </span>
          <button
            onClick={handleRefresh}
            className="w-9 h-9 rounded-xl bg-[#F8FAFC] dark:bg-[#1B2738] hover:bg-[#F1F5F9] text-[#4B5563] dark:text-[#CBD5E1] flex items-center justify-center border border-[#E2E8F0] dark:border-[#24344B] transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            title={lang === 'hi' ? 'वर्तमान जीपीएस स्थान ताज़ा करें' : 'Refresh Current GPS Location'}
            aria-label="Refresh Current GPS Location"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || status === 'detecting' ? 'animate-spin text-[#0F4C81] dark:text-[#81D4FA]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Prompt State: Clear Action to Allow Location */}
      {status === 'prompt' && (
        <div className="p-3 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-2.5 text-blue-900 dark:text-blue-200 text-xs">
            <Navigation2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="leading-tight">
              {lang === 'hi'
                ? 'लाइव स्थानीय मौसम और आपदा चेतावनी देखने के लिए जीपीएस की अनुमति दें।'
                : 'Allow browser location to access live local meteorology & disaster early warnings.'}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefreshGPS();
            }}
            className="shrink-0 px-3 py-1.5 bg-[#0F4C81] hover:bg-[#0D3B66] text-white text-xs font-bold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            {lang === 'hi' ? 'सक्षम करें' : 'Enable GPS'}
          </button>
        </div>
      )}

      {/* Denied State: Clear guidance explaining how the user can enable location (Requirement 10) */}
      {status === 'denied' && (
        <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-2xl text-xs space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 font-bold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{lang === 'hi' ? 'जीपीएस अनुमति अस्वीकृत - कैसे सक्षम करें:' : 'GPS Denied - How to Enable Live Location:'}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefreshGPS();
              }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center space-x-1 cursor-pointer transition-all active:scale-95"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{lang === 'hi' ? 'पुनः प्रयास करें' : 'Retry GPS'}</span>
            </button>
          </div>
          <ol className="list-decimal list-inside text-amber-800 dark:text-amber-300 space-y-1 text-[11px] leading-relaxed">
            <li>
              {lang === 'hi'
                ? 'ब्राउज़र एड्रेस बार में लॉक 🔒 या ट्यून 🎛️ आइकन पर क्लिक करें।'
                : 'Click the padlock 🔒 or tune icon 🎛️ on the left of the browser address bar.'}
            </li>
            <li>
              {lang === 'hi'
                ? 'स्थान (Location) अनुमति को "अनुमति दें" (Allow) पर सेट करें।'
                : 'Change the "Location" permission to "Allow".'}
            </li>
            <li>
              {lang === 'hi'
                ? 'विंडोज पर: सुनिश्चित करें कि Windows Settings > Privacy & security > Location चालू (On) है।'
                : 'On Windows: Verify Windows Settings > Privacy & security > Location is toggled On.'}
            </li>
            <li>
              {lang === 'hi'
                ? 'ऊपर "पुनः प्रयास करें" (Retry GPS) पर क्लिक करें।'
                : 'Click the "Retry GPS" button above to activate your dynamic coordinates.'}
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};

