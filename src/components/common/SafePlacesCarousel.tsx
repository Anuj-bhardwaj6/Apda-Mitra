"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, Navigation, Phone, HeartPulse, Shield, Flame, CheckCircle2, Clock } from "lucide-react";
import { Language, LOCALIZATION } from "@/constants/localization";

export interface SafePlaceItem {
  id: string;
  name: string;
  category: "shelter" | "hospital" | "police" | "fire";
  distanceKm: number;
  etaMinutes: number;
  address: string;
  phone: string;
  capacity?: string;
  status: "Open" | "Ready 24/7" | "Full";
  lat: number;
  lng: number;
}

interface SafePlacesCarouselProps {
  places?: SafePlaceItem[];
  lang?: Language;
  onSelectPlace?: (place: SafePlaceItem) => void;
  onNavigate?: (place: SafePlaceItem) => void;
}

export function SafePlacesCarousel({
  places = [],
  lang = "en",
  onSelectPlace,
  onNavigate,
}: SafePlacesCarouselProps) {
  const t = LOCALIZATION[lang];
  const [activeFilter, setActiveFilter] = useState<"all" | "shelter" | "hospital" | "police" | "fire">("all");

  const filtered = places.filter((p) => {
    if (activeFilter === "all") return true;
    return p.category === activeFilter;
  });

  const getCategoryIcon = (cat: SafePlaceItem["category"]) => {
    switch (cat) {
      case "hospital":
        return <HeartPulse className="w-4 h-4 text-[#C62828]" />;
      case "police":
        return <Shield className="w-4 h-4 text-[#0F4C81]" />;
      case "fire":
        return <Flame className="w-4 h-4 text-[#F59E0B]" />;
      default:
        return <Building2 className="w-4 h-4 text-[#2E7D32]" />;
    }
  };

  if (places.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-3">
      {/* Header & Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-[#16202A] tracking-tight">
                {t.safePlacesTitle}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32]">
                Verified Safe
              </span>
            </div>
            <p className="text-xs text-[#5F6D7E]">{t.safePlacesSubtitle}</p>
          </div>
          <Link
            href="/shelters"
            className="text-[11px] font-bold text-[#0F4C81] hover:underline px-2.5 py-1 rounded-full bg-[#E8F1F8] border border-[#0F4C81]/15 shrink-0 ml-2"
          >
            All Shelters →
          </Link>
        </div>


        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {(
            [
              { key: "all", label: lang === "en" ? "All" : "सभी" },
              { key: "shelter", label: lang === "en" ? "Shelters" : "राहत शिविर" },
              { key: "hospital", label: lang === "en" ? "Hospitals" : "अस्पताल" },
              { key: "police", label: lang === "en" ? "Police" : "पुलिस" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveFilter(item.key)}
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${
                activeFilter === item.key
                  ? "bg-[#0F4C81] text-white"
                  : "bg-white text-[#5F6D7E] border border-[#E4E7EC] hover:bg-[#F6F8FA]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Shelf of Clean Safe Haven Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 px-0.5 no-scrollbar snap-x snap-mandatory">
        {filtered.map((place) => (
          <div
            key={place.id}
            onClick={() => onSelectPlace?.(place)}
            className="snap-start shrink-0 w-[275px] sm:w-[300px] p-4 bg-white rounded-3xl border border-[#E4E7EC] hover:border-[#0F4C81]/40 transition shadow-subtle flex flex-col justify-between cursor-pointer"
          >
            <div>
              {/* Category Icon and Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-xl bg-[#F6F8FA] flex items-center justify-center border border-[#E4E7EC]">
                    {getCategoryIcon(place.category)}
                  </div>
                  <span className="text-xs font-bold text-[#5F6D7E] capitalize">
                    {place.category}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#E8F5E9] text-[#2E7D32]">
                  {place.status}
                </span>
              </div>

              {/* Title & Address */}
              <h4 className="mt-2.5 text-sm font-extrabold text-[#16202A] leading-snug line-clamp-1">
                {place.name}
              </h4>
              <p className="text-xs text-[#5F6D7E] line-clamp-1 mt-0.5">{place.address}</p>

              {/* Distance, ETA, Capacity */}
              <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-[#16202A]">
                <span className="text-[#0F4C81] font-bold">{place.distanceKm} km</span>
                <span className="text-[#5F6D7E]">•</span>
                <span className="text-[#5F6D7E]">~{place.etaMinutes} min</span>
                {place.capacity && (
                  <>
                    <span className="text-[#5F6D7E]">•</span>
                    <span className="text-[#2E7D32] text-[11px] truncate">{place.capacity}</span>
                  </>
                )}
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="mt-3 pt-2.5 border-t border-[#E4E7EC] grid grid-cols-2 gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate?.(place);
                }}
                type="button"
                className="py-2 px-3 rounded-xl bg-[#0F4C81] hover:bg-[#0A365C] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
              >
                <Navigation className="w-3.5 h-3.5 fill-current" />
                <span>{t.navigate}</span>
              </button>

              <a
                href={`tel:${place.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="py-2 px-3 rounded-xl bg-[#F6F8FA] hover:bg-[#EEF1F6] border border-[#E4E7EC] text-[#16202A] text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>Call</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
