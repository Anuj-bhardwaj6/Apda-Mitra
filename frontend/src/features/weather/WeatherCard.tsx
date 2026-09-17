'use client';

import React, { useState } from 'react';
import {
  CloudRain,
  Sun,
  Cloud,
  CloudLightning,
  ChevronDown,
  ChevronUp,
  Layers,
  AlertTriangle,
  Calendar,
  Waves,
  Mountain,
  Gauge,
  CloudOff,
  Clock,
  MapPin
} from 'lucide-react';

import { WeatherData, UXState } from '@/shared/types';

interface WeatherCardProps {
  weather: WeatherData | null;
  state?: UXState;
  lang: 'en' | 'hi';
}

function getWeatherIcon(iconName: string, className: string = 'w-4 h-4') {
  switch (iconName) {
    case 'sun':
      return <Sun className={`${className} text-amber-500`} />;
    case 'heavy-rain':
      return <CloudLightning className={`${className} text-[#0F4C81] dark:text-[#81D4FA]`} />;
    case 'rain':
      return <CloudRain className={`${className} text-[#0F4C81] dark:text-[#81D4FA]`} />;
    case 'cloud':
    default:
      return <Cloud className={`${className} text-slate-400`} />;
  }
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  weather,
  state = 'loaded',
  lang,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [forecastTab, setForecastTab] = useState<'hourly' | 'daily'>('hourly');

  // Error State: Real API failed -> Show "Weather data unavailable" instead of fake values
  if (state === 'error' || (!weather && state !== 'loading')) {
    return (
      <div className="w-full p-5 rounded-[24px] bg-white dark:bg-[#131D2A] border border-amber-300/80 dark:border-amber-800/80 shadow-xs space-y-2.5 text-center py-7">
        <div className="w-11 h-11 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <CloudOff className="w-6 h-6" />
        </div>
        <h3 className="text-base font-extrabold text-[#1F2937] dark:text-white">
          {lang === 'hi' ? 'मौसम डेटा अनुपलब्ध' : 'Weather data unavailable'}
        </h3>
        <p className="text-xs text-[#4B5563] dark:text-[#CBD5E1] max-w-xs mx-auto leading-relaxed">
          {lang === 'hi'
            ? 'ओपन-मेटियो वायुमंडलीय सर्वर से वास्तविक समय का मौसम डेटा प्राप्त करने में असमर्थ। कृपया नेटवर्क या स्थान की जाँच करें।'
            : 'Live Open-Meteo meteorological telemetry is currently unreachable for this location.'}
        </p>
        <div className="pt-1">
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <span>Open-Meteo Offline / No Fake Data</span>
          </span>
        </div>
      </div>
    );
  }

  // Skeleton Loading UX State
  if (state === 'loading' || !weather) {
    return (
      <div className="w-full p-4 sm:p-5 rounded-[24px] bg-white dark:bg-[#131D2A] border border-[#E2E8F0] dark:border-[#24344B] animate-pulse space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
        </div>
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
        <span className="text-[10px] text-gray-400 block pt-1">
          {lang === 'hi' ? 'ओपन-मेटियो लाइव डेटा लोड हो रहा है...' : 'Connecting to Open-Meteo live atmospheric feed...'}
        </span>
      </div>
    );
  }

  const isCriticalSoil = (weather.soilMoisturePct ?? 0) >= 75;
  const isElevatedSoil = (weather.soilMoisturePct ?? 0) >= 55;

  return (
    <div className="w-full p-4 sm:p-5 rounded-[24px] bg-white dark:bg-[#131D2A] border border-[#E2E8F0] dark:border-[#24344B] shadow-xs space-y-3 transition-all">
      {/* 1. Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
            {lang === 'hi' ? 'स्थानीय मौसम' : 'Live Meteorology'}
          </span>
          {/* Small "Live • Open-Meteo" indicator with last updated time */}
          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E8F5E9] dark:bg-[#1B2F20] text-[#2E7D32] dark:text-[#81C784] border border-[#A5D6A7]/50 dark:border-[#2E7D32]/50">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse" />
            <span>Live • Open-Meteo {weather.lastUpdatedTime ? `(${weather.lastUpdatedTime})` : ''}</span>
          </span>

          {weather.latitude !== undefined && weather.longitude !== undefined && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold flex items-center space-x-0.5">
              <MapPin className="w-3 h-3 text-[#0F4C81] dark:text-[#81D4FA]" />
              <span>{weather.latitude.toFixed(4)}°N, {weather.longitude.toFixed(4)}°E</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          {weather.rainfallAlertTier && weather.rainfallAlertTier !== 'Normal / Light' && (
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
              <span>{weather.rainfallAlertTier}</span>
            </span>
          )}
          <span className="text-xs font-bold text-[#0F4C81] dark:text-[#81D4FA] bg-[#EBF3FA] dark:bg-[#1B2738] px-2.5 py-0.5 rounded-full border border-[#D0E2F2] dark:border-[#24344B]">
            {lang === 'hi' ? weather.conditionHi : weather.condition}
          </span>
        </div>
      </div>

      {/* 1b. Phase 2 Environmental Badges (AQI & River Discharge) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {weather.usAqi !== undefined && (
          <span
            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors"
            style={{
              backgroundColor: weather.usAqi <= 50 ? '#E8F5E9' : weather.usAqi <= 100 ? '#FFF8E1' : '#FFEBEE',
              borderColor: weather.usAqi <= 50 ? '#A5D6A7' : weather.usAqi <= 100 ? '#FFE082' : '#FFCDD2',
              color: weather.usAqi <= 50 ? '#2E7D32' : weather.usAqi <= 100 ? '#B78103' : '#C62828',
            }}
          >
            <Gauge className="w-3 h-3" />
            <span>AQI {weather.usAqi} ({weather.aqiCategory || 'Good'})</span>
          </span>
        )}

        {weather.riverDischargeM3s !== undefined && (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF3FA] dark:bg-[#1B2738] text-[#0F4C81] dark:text-[#81D4FA] border border-[#D0E2F2] dark:border-[#24344B]">
            <Waves className="w-3 h-3 text-[#0F4C81] dark:text-[#81D4FA]" />
            <span>Basin Flow: {weather.riverDischargeM3s} m³/s ({weather.dischargeTrend || 'Stable'})</span>
          </span>
        )}

        {weather.elevationM !== undefined && (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Mountain className="w-3 h-3 text-slate-500" />
            <span>{weather.elevationM.toLocaleString()}m ASL</span>
          </span>
        )}
      </div>

      {/* 2. Temperature & Human Sentence */}
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
          {weather.rainfallTodayMm > 30 ? (
            <CloudLightning className="w-8 h-8" />
          ) : weather.rainfallTodayMm > 5 ? (
            <CloudRain className="w-8 h-8" />
          ) : (
            <Sun className="w-8 h-8 text-amber-500" />
          )}
        </div>
      </div>

      {/* 3. Hourly vs Daily Tab Switcher */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800 text-[11px] font-bold">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setForecastTab('hourly')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              forecastTab === 'hourly'
                ? 'bg-[#0F4C81] text-white shadow-2xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {lang === 'hi' ? 'घंटेवार पूर्वानुमान' : 'Hourly Timeline'}
          </button>
          <button
            onClick={() => setForecastTab('daily')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 ${
              forecastTab === 'daily'
                ? 'bg-[#0F4C81] text-white shadow-2xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>{lang === 'hi' ? '3-दिवसीय पूर्वानुमान' : '3-Day Outlook'}</span>
          </button>
        </div>

        <span className="text-[10px] text-gray-400 font-normal">
          {forecastTab === 'hourly' ? 'Next 12 Hours' : 'Open-Meteo Daily'}
        </span>
      </div>

      {/* 4. Forecast Timeline View */}
      {forecastTab === 'hourly' ? (
        <div className="flex items-center space-x-3 overflow-x-auto py-2 no-scrollbar">
          {weather.hourly.map((h, idx) => (
            <div key={idx} className="flex flex-col items-center min-w-[50px] text-xs shrink-0">
              <span className="text-[10px] text-gray-500 font-medium">{h.time}</span>
              <div className="my-1">
                {getWeatherIcon(h.icon, 'w-4 h-4')}
              </div>
              <span className="font-bold text-gray-800 dark:text-gray-200">{h.temp}°</span>
              <span className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold">{h.rainProb}%</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 py-2">
          {(weather.daily || []).map((d, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1B2738] border border-[#E2E8F0] dark:border-[#24344B] text-center space-y-1"
            >
              <span className="text-[10px] font-bold text-gray-500 block">{d.dayLabel}</span>
              <div className="flex justify-center py-0.5">
                {getWeatherIcon(d.icon, 'w-5 h-5')}
              </div>
              <div className="text-xs font-black text-gray-800 dark:text-gray-100">
                <span>{d.tempMax}°</span>
                <span className="text-gray-400 font-normal ml-1">/ {d.tempMin}°</span>
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                {d.precipSum > 0 ? `${d.precipSum}mm (${d.rainProb}%)` : `${d.rainProb}% rain`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Soil Moisture Multi-Depth Intelligence (Landslide Crucial) */}
      <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#14202E] border border-[#E2E8F0] dark:border-[#24344B] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 font-bold text-gray-700 dark:text-gray-300">
            <Layers className="w-3.5 h-3.5 text-[#0F4C81] dark:text-[#81D4FA]" />
            <span>{lang === 'hi' ? 'मिट्टी की नमी संतृप्ति (भूस्खलन संकेतक)' : 'Soil Saturation (Landslide Trigger)'}</span>
          </div>
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              isCriticalSoil
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                : isElevatedSoil
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
            }`}
          >
            {weather.soilSaturationStatus || (weather.soilMoisturePct !== undefined ? `${weather.soilMoisturePct}% Saturation` : 'Unavailable')}
          </span>
        </div>

        {/* Progress Bar for Soil Moisture */}
        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isCriticalSoil
                ? 'bg-rose-600'
                : isElevatedSoil
                ? 'bg-amber-500'
                : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, weather.soilMoisturePct ?? 0))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
          <span>Surface (0-1cm): <strong>{weather.soilMoistureSurface !== undefined ? `${(weather.soilMoistureSurface * 100).toFixed(0)}% vol` : '—'}</strong></span>
          <span>Rootzone (9-27cm): <strong>{weather.soilMoistureRootzone !== undefined ? `${(weather.soilMoistureRootzone * 100).toFixed(0)}% vol` : '—'}</strong></span>
          <span>Threshold: <strong>75%</strong></span>
        </div>
      </div>

      {/* 6. Collapsible Atmospheric & Environmental Details Toggle */}
      <div className="pt-0.5">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-xs font-bold text-[#4B5563] dark:text-[#CBD5E1] hover:text-[#0F4C81] transition-colors py-1 cursor-pointer"
        >
          <span>{showDetails ? (lang === 'hi' ? 'कम विवरण' : 'Hide Details') : (lang === 'hi' ? 'विस्तृत पर्यावरण एवं वायुमंडलीय आंकड़े' : 'View Full Environmental Telemetry')}</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="grid grid-cols-3 gap-2 pt-2 animate-in fade-in slide-in-from-top-1">
            <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B]">
              <span className="text-[10px] text-gray-500 block">{lang === 'hi' ? 'नदी निर्वहन' : 'River Discharge'}</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">
                {weather.riverDischargeM3s !== undefined ? `${weather.riverDischargeM3s} m³/s` : 'Unavailable'}
              </span>
              <span className="text-[9px] text-[#0F4C81] dark:text-[#81D4FA] block font-semibold">
                {weather.dischargeTrend ? `${weather.dischargeTrend} Flow` : 'Flow telemetry offline'}
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B]">
              <span className="text-[10px] text-gray-500 block">{lang === 'hi' ? 'वायु गुणवत्ता (AQI)' : 'Air Quality (AQI)'}</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">
                {weather.usAqi !== undefined ? `${weather.usAqi} AQI` : 'Unavailable'}
              </span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                {weather.pm25 !== undefined ? `PM2.5: ${weather.pm25} µg/m³` : 'Pollutant feed offline'}
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B]">
              <span className="text-[10px] text-gray-500 block">{lang === 'hi' ? 'ऊंचाई व ढलान' : 'Elevation & Slope'}</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">
                {weather.elevationM !== undefined ? `${weather.elevationM} m` : 'Unavailable'}
              </span>
              <span className="text-[9px] text-gray-500 block font-semibold">
                {weather.slopeDegrees !== undefined ? `${weather.slopeDegrees}° Slope` : 'Slope offline'}
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B]">
              <span className="text-[10px] text-gray-500 block">{lang === 'hi' ? 'आर्द्रता' : 'Humidity'}</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">{weather.humidityPct}%</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B]">
              <span className="text-[10px] text-gray-500 block">{lang === 'hi' ? 'हवा की गति' : 'Wind Speed'}</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">{weather.windSpeedKmh} km/h</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B]">
              <span className="text-[10px] text-gray-500 block">{lang === 'hi' ? '24 घंटे की वर्षा' : 'Rain (24h)'}</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">{weather.rainfallTodayMm} mm</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B]">
              <span className="text-[10px] text-gray-500 block">{lang === 'hi' ? 'वायुमंडलीय दबाव' : 'Pressure'}</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">
                {weather.surfacePressureHpa !== undefined ? `${weather.surfacePressureHpa} hPa` : '—'}
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B]">
              <span className="text-[10px] text-gray-500 block">{lang === 'hi' ? 'यूवी इंडेक्स' : 'UV Index'}</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">
                {weather.uvIndex !== undefined ? `${weather.uvIndex} / 10` : '—'}
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B]">
              <span className="text-[10px] text-gray-500 block">{lang === 'hi' ? 'डेटा स्रोत' : 'Source'}</span>
              <span className="text-xs font-bold text-[#0F4C81] dark:text-[#81D4FA] truncate block">
                {weather.source || 'Open-Meteo Multi-API'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

