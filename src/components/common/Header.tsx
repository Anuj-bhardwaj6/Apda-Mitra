"use client";

import React, { useState } from "react";
import { PhoneCall, ShieldAlert, Globe, ChevronDown, Check, MapPin } from "lucide-react";
import { GOV_INFO, SUPPORTED_LANGUAGES } from "@/constants/government";
import { ThemeToggle } from "./ThemeToggle";
import { GPSIndicator } from "@/components/location/GPSIndicator";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { cn } from "@/utils/cn";

export interface HeaderProps {
  onOpenSos: () => void;
  onOpenLocationSheet?: () => void;
  activeAlertCount?: number;
}

export function Header({
  onOpenSos,
  onOpenLocationSheet,
  activeAlertCount = 4,
}: HeaderProps) {
  const { location, permissionStatus, isLiveGpsActive } = useCurrentLocation();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

  const gpsStatus =
    permissionStatus === "denied"
      ? "offline"
      : isLiveGpsActive
      ? "active"
      : "weak";

  return (
    <header className="w-full bg-gov-surface dark:bg-gov-darkSurface shadow-subtle border-b border-gray-100 dark:border-gray-800 z-30 shrink-0">
      {/* Top Gov Indian Flag Strip */}
      <div className="h-1 w-full flex">
        <div className="h-full w-1/3 bg-gov-saffron" />
        <div className="h-full w-1/3 bg-white" />
        <div className="h-full w-1/3 bg-gov-indiaGreen" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        {/* Left: National Emblem & Portal Branding */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-btn bg-gov-primary text-white flex flex-col items-center justify-center shrink-0 shadow-sm">
            <span className="text-[10px] font-black tracking-widest leading-none">GOI</span>
            <span className="text-[8px] tracking-tighter opacity-80 mt-0.5">NDMA</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg md:text-xl font-bold tracking-tight text-gov-primary dark:text-gov-accent">
                {GOV_INFO.platformNameHindi}
              </span>
              <span className="text-gray-300 dark:text-gray-600 font-light">|</span>
              <span className="text-base md:text-lg font-semibold tracking-tight text-gov-text dark:text-white">
                {GOV_INFO.platformName}
              </span>
              <span className="hidden xl:inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-pill bg-gov-primaryLight text-gov-primary dark:bg-blue-950 dark:text-blue-300">
                Official Intelligence Node
              </span>
            </div>
            <p className="text-[11px] text-gov-muted hidden sm:block leading-tight">
              {GOV_INFO.authority} • {GOV_INFO.ministry}
            </p>
          </div>
        </div>

        {/* Center/Right: Live District Pill, Language, Theme, SOS */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Location Trigger Chip */}
          <button
            type="button"
            onClick={onOpenLocationSheet}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-gray-200 dark:border-gray-700 transition-colors text-left"
            title="Click to Switch Location or Manage Saved Places"
          >
            <MapPin className="w-3.5 h-3.5 text-[#0F4C81] dark:text-[#4C8BF5] shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-[#16202A] dark:text-white block leading-tight">
                {location.district || "Select District"}
              </span>
              <span className="text-[10px] text-gray-500 truncate block leading-none">
                {location.state}
              </span>
            </div>
            <GPSIndicator status={gpsStatus} />
          </button>

          {/* Active Alert Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-btn bg-gov-dangerLight/70 dark:bg-rose-950/40 text-gov-danger border border-gov-danger/20">
            <ShieldAlert className="w-4 h-4 shrink-0 animate-pulse" />
            <span className="text-xs font-semibold">
              {activeAlertCount} Bulletins Active
            </span>
          </div>

          {/* Language Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-medium text-gov-text dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-expanded={langDropdownOpen}
            >
              <Globe className="w-3.5 h-3.5 text-gov-primary dark:text-gov-accent" />
              <span>{currentLangObj.native}</span>
              <ChevronDown className="w-3 h-3 text-gov-muted" />
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-gov-surface dark:bg-gov-darkSurface rounded-card shadow-elevation py-2 z-50 border border-gray-100 dark:border-gray-800">
                <div className="px-3 py-1 text-[11px] font-semibold text-gov-muted uppercase tracking-wider">
                  Select Language / भाषा
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setSelectedLang(lang.code);
                      setLangDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gov-primaryLight dark:hover:bg-gray-800 transition-colors text-gov-text dark:text-white"
                  >
                    <span>
                      {lang.native}{" "}
                      <span className="text-gov-muted text-[11px]">({lang.label})</span>
                    </span>
                    {selectedLang === lang.code && (
                      <Check className="w-3.5 h-3.5 text-gov-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* National 112 SOS Button */}
          <button
            type="button"
            onClick={onOpenSos}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-btn bg-gov-danger text-white hover:bg-red-700 shadow-subtle hover:shadow-elevation transition-all active:scale-95 font-semibold text-xs sm:text-sm"
          >
            <PhoneCall className="w-4 h-4 animate-bounce" />
            <span>SOS 112</span>
          </button>
        </div>
      </div>
    </header>
  );
}
