"use client";

import React from "react";
import { Shield, MapPin, Globe, PhoneCall, Bell, ChevronDown } from "lucide-react";
import { Language, LOCALIZATION } from "@/constants/localization";

interface GovHeaderProps {
  currentLocationName?: string;
  lang?: Language;
  onToggleLang?: () => void;
  onOpenLocationPicker?: () => void;
  onOpenSosModal?: () => void;
  onOpenNotifications?: () => void;
}

export function GovHeader({
  currentLocationName = "All 10 States",
  lang = "en",
  onToggleLang,
  onOpenLocationPicker,
  onOpenSosModal,
  onOpenNotifications,
}: GovHeaderProps) {
  const t = LOCALIZATION[lang];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E4E7EC] shadow-[0_1px_3px_0_rgba(15,76,129,0.03)]">
      {/* Subtle Government & Authority Micro-Banner */}
      <div className="bg-[#0F4C81] text-white px-4 py-1 text-[11px] font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
            <span className="tracking-wide uppercase font-semibold text-white/90">
              {t.officialGoI}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-white/80">
            <span>{t.nationalHelpline}</span>
            <span>•</span>
            <span>{t.ndrfHelpline}</span>
          </div>
        </div>
      </div>

      {/* Main Clean Citizen Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Apda Mitra Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-[#0F4C81] flex items-center justify-center text-white shadow-xs">
            <Shield className="w-5 h-5 stroke-[2.4]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-extrabold tracking-tight text-[#0F4C81] leading-none">
                {t.brand}
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E8F1F8] text-[#0F4C81]">
                OFFICIAL
              </span>
            </div>
            <p className="text-[11px] text-[#5F6D7E] hidden sm:block font-medium mt-0.5">
              {t.subBrand}
            </p>
          </div>
        </div>

        {/* Center: Friendly Location Selector Chip */}
        <button
          onClick={onOpenLocationPicker}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F6F8FA] hover:bg-[#EEF1F6] border border-[#E4E7EC] text-xs font-semibold text-[#16202A] transition max-w-[180px] sm:max-w-[260px] truncate"
          title="Change location"
        >
          <MapPin className="w-3.5 h-3.5 text-[#0F4C81] shrink-0" />
          <span className="truncate">{currentLocationName}</span>
          <ChevronDown className="w-3 h-3 text-[#5F6D7E] shrink-0 ml-0.5" />
        </button>

        {/* Right: Lang switcher, notifications & SOS */}
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-[#E4E7EC] text-xs font-bold text-[#16202A] hover:bg-[#F6F8FA] transition"
            title="Switch Language (हिन्दी / English)"
          >
            <Globe className="w-3.5 h-3.5 text-[#0F4C81]" />
            <span>{lang === "en" ? "हिन्दी" : "EN"}</span>
          </button>

          {/* Notifications */}
          <button
            onClick={onOpenNotifications}
            type="button"
            className="p-2 rounded-full hover:bg-[#F6F8FA] text-[#5F6D7E] hover:text-[#16202A] transition relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C62828]" />
          </button>

          {/* Emergency SOS Pill (Accessible but subtle in normal mode) */}
          <button
            onClick={onOpenSosModal}
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold text-xs shadow-xs transition active:scale-95"
            title="Emergency SOS 112"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span className="tracking-wide">112</span>
          </button>
        </div>
      </div>
    </header>
  );
}
