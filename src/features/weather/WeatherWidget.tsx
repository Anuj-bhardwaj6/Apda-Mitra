"use client";

import React from "react";
import { CloudRain, Wind, Droplets, Gauge, ShieldAlert, Radio } from "lucide-react";
import { WeatherData } from "@/types/weather";
import { Card } from "@/components/ui/Card";
import { RiskChip } from "@/components/ui/RiskChip";
import { GovBadge } from "@/components/common/GovBadge";

// TODO(API)
// OpenMeteo Current Weather
// TODO(API)
// IMD Weather

export interface WeatherWidgetProps {
  weather: WeatherData;
  className?: string;
}

export function WeatherWidget({ weather, className }: WeatherWidgetProps) {
  return (
    <Card elevation="medium" className={className}>
      {/* Header with IMD Station & Official Badge */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GovBadge type="imd" size="sm" />
            <span className="text-xs text-gov-muted flex items-center gap-1 font-medium">
              <Radio className="w-3 h-3 text-gov-success animate-pulse" />
              {weather.radarStation}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gov-text dark:text-white">
            {weather.stationName}
          </h2>
          <p className="text-xs text-gov-muted">{weather.state}</p>
        </div>
        <RiskChip level={weather.imdWarningColor.toUpperCase() as "RED"} size="sm" />
      </div>

      {/* Main Temperature & Severe Condition (Apple Weather style) */}
      <div className="flex items-baseline justify-between my-5">
        <div>
          <div className="text-5xl font-light tracking-tight text-gov-text dark:text-white">
            {weather.temperatureC}
            <span className="text-2xl font-normal text-gov-muted">°C</span>
          </div>
          <p className="text-sm font-semibold text-gov-primary dark:text-gov-accent mt-1 flex items-center gap-1.5">
            <CloudRain className="w-4 h-4 text-gov-primary shrink-0" />
            {weather.condition}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-gov-muted block">Precipitation Chance</span>
          <span className="text-2xl font-bold text-gov-primary dark:text-blue-400">
            {weather.precipitationProbability}%
          </span>
          <span className="text-[11px] text-gov-muted block mt-0.5">
            Feels like {weather.feelsLikeC}°C
          </span>
        </div>
      </div>

      {/* 4-Tile Essential Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="p-3 rounded-btn bg-gov-bg dark:bg-gray-800/60">
          <div className="flex items-center gap-1.5 text-xs text-gov-muted mb-1">
            <Droplets className="w-3.5 h-3.5 text-blue-600" />
            <span>24h Rainfall</span>
          </div>
          <div className="text-base font-bold text-gov-text dark:text-white">
            {weather.rainfallPast24hMm}{" "}
            <span className="text-xs font-normal text-gov-muted">mm</span>
          </div>
        </div>

        <div className="p-3 rounded-btn bg-gov-bg dark:bg-gray-800/60">
          <div className="flex items-center gap-1.5 text-xs text-gov-muted mb-1">
            <Wind className="w-3.5 h-3.5 text-teal-600" />
            <span>Wind Gusts</span>
          </div>
          <div className="text-base font-bold text-gov-text dark:text-white">
            {weather.windGustKmh}{" "}
            <span className="text-xs font-normal text-gov-muted">km/h</span>
          </div>
        </div>

        <div className="p-3 rounded-btn bg-gov-bg dark:bg-gray-800/60">
          <div className="flex items-center gap-1.5 text-xs text-gov-muted mb-1">
            <Gauge className="w-3.5 h-3.5 text-emerald-600" />
            <span>National AQI</span>
          </div>
          <div className="text-base font-bold text-gov-success">
            {weather.aqiValue}{" "}
            <span className="text-xs font-normal text-gov-muted">({weather.aqiCategory})</span>
          </div>
        </div>

        <div className="p-3 rounded-btn bg-gov-bg dark:bg-gray-800/60">
          <div className="flex items-center gap-1.5 text-xs text-gov-muted mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Humidity</span>
          </div>
          <div className="text-base font-bold text-gov-text dark:text-white">
            {weather.humidityPercent}%
          </div>
        </div>
      </div>
    </Card>
  );
}
