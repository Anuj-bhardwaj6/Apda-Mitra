"use client";

import React from "react";
import { AlertOctagon, Navigation, PhoneCall, Share2, Shield, MapPin, ArrowRight } from "lucide-react";
import { Language, LOCALIZATION } from "@/constants/localization";
import { SafePlaceItem } from "@/components/common/SafePlacesCarousel";

interface DisasterModeHeroProps {
  locationName: string;
  dangerDescription: string;
  nearestShelter?: SafePlaceItem;
  lang?: Language;
  onNavigateToShelter: () => void;
  onCall112: () => void;
  onShareLocation: () => void;
}

export function DisasterModeHero({
  locationName,
  dangerDescription,
  nearestShelter,
  lang = "en",
  onNavigateToShelter,
  onCall112,
  onShareLocation,
}: DisasterModeHeroProps) {
  const t = LOCALIZATION[lang];

  return (
    <div className="w-full rounded-3xl bg-[#C62828] text-white p-6 shadow-xl border-2 border-red-400/50 space-y-6 animate-fadeIn">
      {/* Top Warning Alert Header */}
      <div className="flex items-center justify-between border-b border-white/20 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-white text-[#C62828] flex items-center justify-center font-black animate-pulse">
            <AlertOctagon className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/90">
              LIFE-SAFETY PRIORITY
            </span>
            <h2 className="text-xl font-black text-white leading-tight">
              {t.disasterModeTitle}
            </h2>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-white/20 text-white font-extrabold text-xs tracking-wider uppercase">
          RED LEVEL
        </span>
      </div>

      {/* Current Danger Explanation */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-white/80 uppercase tracking-wide">
          {lang === "en" ? "Current Danger in Your Area:" : "आपके क्षेत्र में वर्तमान खतरा:"}
        </span>
        <p className="text-lg font-bold text-white leading-snug">
          {dangerDescription}
        </p>
        <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
          <MapPin className="w-3.5 h-3.5" />
          <span>{locationName}</span>
        </p>
      </div>

      {/* Nearest Verified Shelter Card */}
      {nearestShelter && (
        <div className="bg-white text-[#16202A] p-4 rounded-2xl shadow-md space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#5F6D7E]">
            <span className="text-[#2E7D32] font-bold uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              {t.nearestShelter}
            </span>
            <span className="font-bold text-[#16202A]">
              ~{nearestShelter.etaMinutes} min • {nearestShelter.distanceKm} km
            </span>
          </div>

          <div>
            <h3 className="text-base font-extrabold text-[#16202A] leading-tight">
              {nearestShelter.name}
            </h3>
            <p className="text-xs text-[#5F6D7E] mt-0.5">{nearestShelter.address}</p>
          </div>

          <button
            onClick={onNavigateToShelter}
            type="button"
            className="w-full py-3.5 px-4 rounded-xl bg-[#0F4C81] hover:bg-[#0A365C] text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
          >
            <Navigation className="w-4 h-4 fill-current animate-pulse" />
            <span>{t.evacuateNow}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emergency Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* Call 112 */}
        <button
          onClick={onCall112}
          type="button"
          className="py-3.5 px-4 rounded-2xl bg-white text-[#C62828] font-black text-sm shadow-md flex items-center justify-center gap-2 hover:bg-white/90 transition active:scale-95"
        >
          <PhoneCall className="w-4 h-4 fill-current" />
          <span>{t.sosCall}</span>
        </button>

        {/* Share Location */}
        <button
          onClick={onShareLocation}
          type="button"
          className="py-3.5 px-4 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition active:scale-95 border border-white/30"
        >
          <Share2 className="w-4 h-4" />
          <span>{lang === "en" ? "Share Live GPS" : "जीपीएस भेजें"}</span>
        </button>
      </div>
    </div>
  );
}
