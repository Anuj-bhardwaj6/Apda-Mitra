'use client';

import React, { useState } from 'react';
import { CloudRain, Wind, Droplets, Sun, ChevronDown, ChevronUp } from 'lucide-react';
import { WeatherData, UXState } from '@/shared/types';

interface WeatherCardProps {
  weather: WeatherData | null;
  state?: UXState;
  lang: 'en' | 'hi';
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  weather,
  state = 'loaded',
  lang,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Skeleton Loading UX State
  if (state === 'loading' || !weather) {
    return (
      <div className="w-full p-4 sm:p-5 rounded-[24px] bg-white dark:bg-[#131D2A] border border-[#E2E8F0] dark:border-[#24344B] animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-5 rounded-[24px] bg-white dark:bg-[#131D2A] border border-[#E2E8F0] dark:border-[#24344B] shadow-sm space-y-3 transition-all">
      {/* 1. Header Row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
          {lang === 'hi' ? 'स्थानीय मौसम की स्थिति' : 'Weather Now'}
        </span>
        <span className="text-xs font-bold text-[#0F4C81] dark:text-[#81D4FA] bg-[#EBF3FA] dark:bg-[#1B2738] px-2.5 py-0.5 rounded-full border border-[#D0E2F2] dark:border-[#24344B]">
          {lang === 'hi' ? weather.conditionHi : weather.condition}
        </span>
      </div>

      {/* 2. Apple Weather Style Hero: Temperature & Human Sentence */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl sm:text-5xl font-black text-[#1F2937] dark:text-white tracking-tight">
              {weather.temperatureC}°
            </span>
            <span className="text-sm font-semibold text-[#4B5563] dark:text-[#CBD5E1]">
              {lang === 'hi' ? `महसूस: ${weather.feelsLikeC}°` : `Feels like ${weather.feelsLikeC}°`}
            </span>
          </div>

          <p className="text-xs sm:text-sm font-medium text-[#0F4C81] dark:text-[#81D4FA] mt-1">
            {lang === 'hi' ? weather.humanPredictionSentenceHi : weather.humanPredictionSentence}
          </p>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-[#EBF3FA] dark:bg-[#1B2738] flex items-center justify-center text-[#0F4C81] dark:text-[#81D4FA] shrink-0">
          <CloudRain className="w-8 h-8" />
        </div>
      </div>

      {/* 3. Hourly Forecast Timeline */}
      <div className="flex items-center space-x-3 overflow-x-auto py-2 no-scrollbar border-t border-b border-gray-100 dark:border-gray-800">
        {weather.hourly.map((h, idx) => (
          <div key={idx} className="flex flex-col items-center min-w-[48px] text-xs">
            <span className="text-[10px] text-gray-500 font-medium">{h.time}</span>
            <CloudRain className="w-4 h-4 text-[#0F4C81] dark:text-[#81D4FA] my-1" />
            <span className="font-bold text-gray-800 dark:text-gray-200">{h.temp}°</span>
            <span className="text-[9px] text-blue-600 font-semibold">{h.rainProb}%</span>
          </div>
        ))}
      </div>

      {/* 4. Collapsible Details Toggle (Human First Hierarchy) */}
      <div className="pt-1">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-xs font-bold text-[#4B5563] dark:text-[#CBD5E1] hover:text-[#0F4C81] transition-colors py-1 cursor-pointer"
        >
          <span>{showDetails ? (lang === 'hi' ? 'कम विवरण' : 'Hide Details') : (lang === 'hi' ? 'विस्तृत आंकड़े' : 'View Weather Details')}</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="grid grid-cols-3 gap-2 pt-2 animate-in fade-in slide-in-from-top-1">
            <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B]">
              <span className="text-[10px] text-gray-500 block">{lang === 'hi' ? 'आर्द्रता' : 'Humidity'}</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">{weather.humidityPct}%</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B]">
              <span className="text-[10px] text-gray-500 block">{lang === 'hi' ? 'हवा' : 'Wind'}</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">{weather.windSpeedKmh} km/h</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B]">
              <span className="text-[10px] text-gray-500 block">{lang === 'hi' ? 'वर्षा' : 'Rain'}</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">{weather.rainfallTodayMm} mm</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
