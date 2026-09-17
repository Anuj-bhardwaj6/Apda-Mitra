"use client";

import React from "react";
import { CloudRain } from "lucide-react";
import { WeatherData } from "@/types/weather";
import { Card } from "@/components/ui/Card";

export interface ForecastStripProps {
  hourlyForecast: WeatherData["hourlyForecast"];
  className?: string;
}

export function ForecastStrip({ hourlyForecast, className }: ForecastStripProps) {
  return (
    <Card elevation="subtle" className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gov-text dark:text-white uppercase tracking-wider">
          Severe Precipitation Timeline (Next 6 Hours)
        </h3>
        <span className="text-xs text-gov-muted">Updated via IMD Radar</span>
      </div>

      <div className="grid grid-cols-6 gap-2 pt-2">
        {hourlyForecast.map((hour, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-between p-2.5 rounded-btn bg-gov-bg dark:bg-gray-800/40 text-center"
          >
            <span className="text-xs text-gov-muted font-medium">{hour.time}</span>
            <div className="my-2">
              <CloudRain className="w-5 h-5 text-gov-primary mx-auto" />
              <span className="text-xs font-bold text-gov-primary mt-1 block">
                {hour.rainProb}%
              </span>
            </div>
            <span className="text-xs font-semibold text-gov-text dark:text-white">
              {hour.tempC}°
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
