"use client";

import React from "react";
import { CloudRain, Sun, Cloud, Wind, Droplets, Eye, Clock } from "lucide-react";
import { Language, LOCALIZATION } from "@/constants/localization";

interface WeatherProps {
  weather?: {
    tempC: number;
    feelsLikeC: number;
    condition: string;
    narrative: string;
    rainMm: number;
    humidity: number;
    windKmh: number;
    visibilityKm: number;
  };
  locationName?: string;
  lang?: Language;
}

export function HumanWeatherCard({
  weather = {
    tempC: 22,
    feelsLikeC: 22,
    condition: "Partly Cloudy",
    narrative: "Rain expected after 5 PM.",
    rainMm: 4.2,
    humidity: 68,
    windKmh: 14,
    visibilityKm: 10,
  },
  locationName = "Your Area",
  lang = "en",
}: WeatherProps) {
  const t = LOCALIZATION[lang];

  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes("rain") || c.includes("shower") || c.includes("storm")) {
      return <CloudRain className="w-10 h-10 text-[#0F4C81] stroke-[1.8]" />;
    }
    if (c.includes("cloud") || c.includes("overcast")) {
      return <Cloud className="w-10 h-10 text-[#64748B] stroke-[1.8]" />;
    }
    return <Sun className="w-10 h-10 text-[#F59E0B] stroke-[1.8]" />;
  };

  return (
    <div className="py-4 px-2 space-y-3">
      {/* Top Header Row with Source Attribution */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-black tracking-wider text-[#5F6D7E] uppercase">
            {t.weatherTitle}
          </span>
          <h3 className="text-sm font-extrabold text-[#16202A] truncate">
            {locationName}
          </h3>
        </div>

        <span className="text-[10px] font-bold text-[#5F6D7E] bg-[#F6F8FA] px-2 py-0.5 rounded-md border border-[#E4E7EC]">
          Source: IMD • Doppler Telemetry
        </span>
      </div>

      {/* Temperature and Condition (Apple Weather style clean typography) */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-black tracking-tight text-[#16202A]">
            {weather.tempC}°
          </span>
          <div>
            <p className="text-base font-extrabold text-[#16202A] leading-tight">
              {weather.condition}
            </p>
            <p className="text-xs font-semibold text-[#5F6D7E]">
              {t.feelsLike} {weather.feelsLikeC}°
            </p>
          </div>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-[#F6F8FA] border border-[#E4E7EC] flex items-center justify-center">
          {getWeatherIcon(weather.condition)}
        </div>
      </div>

      {/* Human Narrative Sentence */}
      <p className="text-xs font-semibold text-[#16202A] leading-relaxed">
        🌧️ {weather.narrative}
      </p>

      {/* 4 Compact Consumer Metrics (Subtle Divider Grid, No Clunky Boxes) */}
      <div className="pt-2 border-t border-[#E4E7EC]/70 grid grid-cols-4 gap-2 text-center text-xs">
        <div>
          <span className="text-[10px] font-bold text-[#5F6D7E] block uppercase">{t.rainfall}</span>
          <span className="font-extrabold text-[#16202A]">{weather.rainMm} mm</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-[#5F6D7E] block uppercase">{t.humidity}</span>
          <span className="font-extrabold text-[#16202A]">{weather.humidity}%</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-[#5F6D7E] block uppercase">{t.wind}</span>
          <span className="font-extrabold text-[#16202A]">{weather.windKmh} km/h</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-[#5F6D7E] block uppercase">{t.visibility}</span>
          <span className="font-extrabold text-[#16202A]">{weather.visibilityKm} km</span>
        </div>
      </div>
    </div>
  );
}
