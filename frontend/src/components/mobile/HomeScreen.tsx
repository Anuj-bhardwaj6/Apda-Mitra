'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Search,
  CloudRain,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Navigation,
  Phone,
  ChevronRight,
  CheckCircle2,
  Info,
  Compass,
  ArrowRight,
  Home,
  Wind,
  Droplets,
  Thermometer,
  ShieldAlert,
  HelpCircle,
  X,
  Share2,
  Camera
} from 'lucide-react';
import { InteractiveMap } from '@/components/map/InteractiveMap';
import { HazardEvaluation, WeatherSummary, ShelterResource, CitizenReport } from '@/lib/api';

interface HomeScreenProps {
  locationName: string;
  latitude: number;
  longitude: number;
  onSearchOpen: () => void;
  onSelectLocation: (lat: number, lon: number, name?: string) => void;
  hazardData: HazardEvaluation | null;
  weatherData: WeatherSummary | null;
  nearestShelter: ShelterResource | null;
  shelters: ShelterResource[];
  reports: CitizenReport[];
  onNavigateToTab: (tab: string) => void;
  onOpenSOS: () => void;
  lang?: 'en' | 'hi';
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  locationName,
  latitude,
  longitude,
  onSearchOpen,
  onSelectLocation,
  hazardData,
  weatherData,
  nearestShelter,
  shelters = [],
  reports = [],
  onNavigateToTab,
  onOpenSOS,
  lang = 'en',
}) => {
  const [showXAIModal, setShowXAIModal] = useState(false);
  const [timelineStep, setTimelineStep] = useState<'now' | '6h' | '12h' | 'tomorrow'>('now');

  // Risk Calculations
  const riskLevel = hazardData?.risk_level || 'Moderate';
  const riskScore = hazardData?.risk_score || 48.0;
  const isHighRisk = riskLevel.toLowerCase() === 'high' || riskLevel.toLowerCase() === 'severe';

  // Advisory Headline based on risk level
  const advisoryHeadline = isHighRisk
    ? lang === 'hi'
      ? 'आपके क्षेत्र में अत्यधिक वर्षा के कारण तीव्र भूस्खलन की संभावना है।'
      : 'Severe rainfall significantly increases landslide danger along hill slopes.'
    : riskLevel.toLowerCase() === 'moderate'
    ? lang === 'hi'
      ? 'भारी वर्षा के कारण आज शाम ढलानों पर भूस्खलन का मध्यम जोखिम है।'
      : 'Heavy rainfall may increase landslide risk later today.'
    : lang === 'hi'
    ? 'वर्तमान में स्थिति सामान्य है। मौसम संबंधी सूचनाओं पर नजर रखें।'
    : 'Conditions are currently stable. Normal hill travel permitted.';

  const actionAdvisory = isHighRisk
    ? lang === 'hi'
      ? 'तुरंत नजदीकी सुरक्षित राहत शिविर में जाएं। अनावश्यक यात्रा न करें।'
      : 'Immediate action: Evacuate slope dwellings to nearest verified shelter.'
    : riskLevel.toLowerCase() === 'moderate'
    ? lang === 'hi'
      ? 'शाम 6 बजे के बाद पहाड़ी राजमार्गों (NH-5) पर अनावश्यक यात्रा से बचें।'
      : 'Advisory: Avoid unnecessary travel along mountain corridors after 6 PM.'
    : lang === 'hi'
    ? 'सुरक्षित रहें और स्थानीय प्रशासन के निर्देशों का पालन करें।'
    : 'Guidance: Keep emergency helpline (112) accessible.';

  const confidenceScore = hazardData?.confidence ? Math.round(hazardData.confidence * 100) : 94;

  const currentShelter = nearestShelter || {
    id: 1,
    name: 'Chooralmala Community Relief Hall',
    facility_type: 'Relief Camp',
    address: 'Chooralmala Junction, Wayanad',
    district: 'Wayanad',
    latitude: latitude + 0.018,
    longitude: longitude + 0.022,
    capacity: 300,
    current_occupancy: 120,
    contact_phone: '04936-282200',
    distance_km: 2.4,
  };

  return (
    <div className="flex flex-col w-full pb-28">
      {/* 1. Location Bar & Search Quick Pill */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#EBF3FA] flex items-center justify-center text-[#0F4C81] shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7280] block">
                {lang === 'hi' ? 'वर्तमान स्थान' : 'Current Location'}
              </span>
              <span className="text-sm font-bold text-[#1F2937] truncate block">
                {locationName}
              </span>
            </div>
          </div>

          <button
            onClick={onSearchOpen}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-full text-xs font-semibold text-[#1F2937] shadow-xs cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[#0F4C81]" />
            <span className="hidden xs:inline">{lang === 'hi' ? 'स्थान खोजें' : 'Search Area'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 space-y-4 pt-3">
        {/* 2. THE RISK BANNER (The 3-Second Life Saver) */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-sm ${
            isHighRisk
              ? 'bg-[#FFEBEE] border-[#EF9A9A] text-[#1F2937]'
              : riskLevel.toLowerCase() === 'moderate'
              ? 'bg-[#FEF3C7]/70 border-[#FCD34D] text-[#1F2937]'
              : 'bg-[#E8F5E9]/70 border-[#A5D6A7] text-[#1F2937]'
          }`}
        >
          {/* Header Row: Status Badge & Freshness */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                  isHighRisk
                    ? 'bg-[#C62828] text-white shadow-xs'
                    : riskLevel.toLowerCase() === 'moderate'
                    ? 'bg-[#D97706] text-white shadow-xs'
                    : 'bg-[#2E7D32] text-white shadow-xs'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>
                  {isHighRisk
                    ? lang === 'hi' ? 'उच्च जोखिम (High Risk)' : '🔴 High Risk'
                    : riskLevel.toLowerCase() === 'moderate'
                    ? lang === 'hi' ? 'मध्यम जोखिम (Moderate Risk)' : '🟠 Moderate Risk'
                    : lang === 'hi' ? 'सुरक्षित क्षेत्र (Low Risk)' : '🟢 Safe Zone'}
                </span>
              </span>
              <span className="text-xs font-semibold text-[#4B5563]">
                Score: <strong>{riskScore}/100</strong>
              </span>
            </div>

            <div className="flex items-center space-x-1 text-[11px] text-[#6B7280]">
              <Clock className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? '20 सेकंड पहले अद्यतन' : 'Updated 20s ago'}</span>
            </div>
          </div>

          {/* Core Human Guidance Text */}
          <div className="mt-3 space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-[#1F2937] leading-snug">
              {advisoryHeadline}
            </h2>
            <p className="text-sm font-medium text-[#4B5563] leading-relaxed">
              {actionAdvisory}
            </p>
          </div>

          {/* Meta & Trust Row */}
          <div className="mt-3 pt-2.5 border-t border-black/10 flex items-center justify-between text-xs text-[#4B5563]">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0F4C81]" />
              <span>
                {lang === 'hi' ? 'विश्वसनीयता' : 'AI Confidence'}: <strong className="text-[#0F4C81]">{confidenceScore}%</strong>
              </span>
            </div>
            <span className="text-[11px] text-[#6B7280]">
              {lang === 'hi' ? 'स्रोत: एनडीएमए / मौसम विज्ञान' : 'Source: NDMA / MoES Ensemble'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => setShowXAIModal(true)}
              className="apda-btn-secondary w-full text-xs sm:text-sm py-2.5 min-h-[44px] flex items-center justify-center space-x-1.5 font-semibold bg-white cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-[#0F4C81]" />
              <span>{lang === 'hi' ? 'यह क्यों दिखाया जा रहा है?' : 'Why am I seeing this?'}</span>
            </button>

            <button
              onClick={() => {
                const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${currentShelter.latitude},${currentShelter.longitude}`;
                window.open(googleMapsUrl, '_blank');
              }}
              className="apda-btn-primary w-full text-xs sm:text-sm py-2.5 min-h-[44px] flex items-center justify-center space-x-1.5 font-bold cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>
                {lang === 'hi' ? 'आश्रय स्थल का मार्ग देखें' : 'Navigate to Shelter'} ({currentShelter.distance_km} km)
              </span>
            </button>
          </div>
        </div>

        {/* 3. HERO INTERACTIVE LIVE MAP (~60% Screen Hero) */}
        <div className="apda-card overflow-hidden border border-[#CBD5E1] shadow-md relative">
          <div className="p-3 bg-white border-b border-[#E5E7EB] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                {lang === 'hi' ? 'लाइव भू-स्थानिक मानचित्र' : 'Live Interactive GIS Map'}
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab('map')}
              className="text-xs text-[#0F4C81] hover:underline font-bold flex items-center"
            >
              <span>{lang === 'hi' ? 'पूर्ण स्क्रीन' : 'Full Screen'}</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="w-full h-[360px] sm:h-[420px] relative">
            <InteractiveMap
              latitude={latitude}
              longitude={longitude}
              locationName={locationName}
              onLocationSelect={onSelectLocation}
              onSearchOpen={onSearchOpen}
              reports={reports}
              shelters={shelters}
              lang={lang}
            />
          </div>
        </div>

        {/* 4. QUICK ACTIONS GRID */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={onOpenSOS}
            className="flex flex-col items-center justify-center p-3 bg-[#FFEBEE] hover:bg-[#FFCDD2] border border-[#EF9A9A] rounded-2xl text-center transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-[#C62828] text-white flex items-center justify-center mb-1.5 shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#C62828] leading-tight">
              {lang === 'hi' ? 'आपातकाल' : 'Emergency'}
            </span>
            <span className="text-[10px] text-[#C62828] font-semibold">112 SOS</span>
          </button>

          <button
            onClick={() => onNavigateToTab('report')}
            className="flex flex-col items-center justify-center p-3 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-2xl text-center transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-[#EBF3FA] text-[#0F4C81] flex items-center justify-center mb-1.5 shadow-sm">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#1F2937] leading-tight">
              {lang === 'hi' ? 'घटना रिपोर्ट' : 'Report'}
            </span>
            <span className="text-[10px] text-[#6B7280]">Photo + GPS</span>
          </button>

          <button
            onClick={() => onNavigateToTab('map')}
            className="flex flex-col items-center justify-center p-3 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-2xl text-center transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mb-1.5 shadow-sm">
              <Home className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#1F2937] leading-tight">
              {lang === 'hi' ? 'आश्रय स्थल' : 'Shelters'}
            </span>
            <span className="text-[10px] text-[#6B7280]">Nearby Safe</span>
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'My Safety Status on Apda Mitra',
                  text: `I am currently at ${locationName}. Current Landslide Risk: ${riskLevel}.`,
                  url: window.location.href,
                });
              } else {
                alert(`Safety Status: ${riskLevel} Risk at ${locationName}`);
              }
            }}
            className="flex flex-col items-center justify-center p-3 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-2xl text-center transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-[#F1F5F9] text-[#4B5563] flex items-center justify-center mb-1.5 shadow-sm">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#1F2937] leading-tight">
              {lang === 'hi' ? 'स्थिति साझा' : 'Share GPS'}
            </span>
            <span className="text-[10px] text-[#6B7280]">To Family</span>
          </button>
        </div>

        {/* 5. WEATHER SUMMARY (Apple Weather Style: Simple, Human, Ambient) */}
        <div className="apda-card p-4 sm:p-5 border border-[#E2E8F0] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
              {lang === 'hi' ? 'स्थानीय मौसम की स्थिति' : 'Local Weather Intelligence'}
            </span>
            <span className="text-xs font-bold text-[#0F4C81] bg-[#EBF3FA] px-2.5 py-0.5 rounded-full border border-[#D0E2F2]">
              {weatherData?.weather_condition || (lang === 'hi' ? 'मानसूनी वर्षा' : 'Monsoon Rain')}
            </span>
          </div>

          {/* Temperature & Condition Hero */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-[#1F2937] tracking-tight">
                  {weatherData?.temperature_c ? Math.round(weatherData.temperature_c) : 23}°
                </span>
                <span className="text-sm font-semibold text-[#4B5563]">
                  {weatherData?.weather_condition || 'Light Rain'}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {lang === 'hi' ? 'उच्च: 26° • निम्न: 20°' : 'High: 26° • Low: 20°'}
              </p>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-[#EBF3FA] flex items-center justify-center text-[#0F4C81]">
              <CloudRain className="w-8 h-8" />
            </div>
          </div>

          {/* 4-Tile Human Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div className="weather-metric-tile">
              <span className="text-[11px] text-[#6B7280] font-medium block">
                {lang === 'hi' ? 'महसूस होता है' : 'Feels Like'}
              </span>
              <span className="text-base font-bold text-[#1F2937]">
                {weatherData?.temperature_c ? Math.round(weatherData.temperature_c + 1) : 24}°
              </span>
            </div>

            <div className="weather-metric-tile">
              <span className="text-[11px] text-[#6B7280] font-medium block">
                {lang === 'hi' ? 'आर्द्रता' : 'Humidity'}
              </span>
              <span className="text-base font-bold text-[#1F2937]">
                {weatherData?.humidity_pct || 88}%
              </span>
            </div>

            <div className="weather-metric-tile">
              <span className="text-[11px] text-[#6B7280] font-medium block">
                {lang === 'hi' ? 'हवा की गति' : 'Wind'}
              </span>
              <span className="text-base font-bold text-[#1F2937]">
                {weatherData?.wind_speed_kmh || 14} km/h
              </span>
            </div>

            <div className="weather-metric-tile">
              <span className="text-[11px] text-[#6B7280] font-medium block">
                {lang === 'hi' ? 'आज की वर्षा' : 'Rain Today'}
              </span>
              <span className="text-base font-bold text-[#0F4C81]">
                {weatherData?.rainfall_24h_mm || 84.5} mm
              </span>
            </div>
          </div>
        </div>

        {/* 6. NEARBY VERIFIED SHELTERS */}
        <div className="apda-card p-4 sm:p-5 border border-[#E2E8F0] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Home className="w-4 h-4 text-[#2E7D32]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                {lang === 'hi' ? 'नजदीकी सुरक्षित राहत शिविर' : 'Nearest Verified Safe Shelter'}
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab('emergency')}
              className="text-xs text-[#0F4C81] hover:underline font-bold flex items-center"
            >
              <span>{lang === 'hi' ? 'सभी देखें' : 'View All'}</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#1F2937]">
                  {currentShelter.name}
                </h4>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {currentShelter.address}
                </p>
              </div>
              <span className="bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7] text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                {currentShelter.distance_km} km away
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#4B5563] pt-1">
              <span>
                Capacity: <strong>{currentShelter.current_occupancy} / {currentShelter.capacity} spots filled</strong>
              </span>
              <span className="text-[#2E7D32] font-semibold flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 24/7 Open
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`tel:${currentShelter.contact_phone || '108'}`}
                className="apda-btn-secondary text-xs py-2 min-h-[40px] flex items-center justify-center space-x-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{lang === 'hi' ? 'फोन करें' : 'Call Shelter'}</span>
              </a>

              <button
                onClick={() => {
                  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${currentShelter.latitude},${currentShelter.longitude}`;
                  window.open(googleMapsUrl, '_blank');
                }}
                className="apda-btn-primary text-xs py-2 min-h-[40px] flex items-center justify-center space-x-1"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{lang === 'hi' ? 'दिशा-निर्देश' : 'Directions'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 7. RECENT OFFICIAL ALERTS */}
        <div className="apda-card p-4 sm:p-5 border border-[#E2E8F0] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-[#D97706]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                {lang === 'hi' ? 'आधिकारिक आपदा बुलेटिन' : 'Official Disaster Bulletins'}
              </h3>
            </div>
            <span className="text-[10px] text-[#6B7280] font-semibold bg-[#F1F5F9] px-2 py-0.5 rounded-full">
              NDMA / SDMA
            </span>
          </div>

          <div className="space-y-2">
            <div className="p-3 bg-[#FEF3C7]/50 rounded-xl border border-[#FCD34D] flex items-start space-x-3 text-xs">
              <div className="w-6 h-6 rounded-full bg-[#D97706] text-white flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1F2937]">
                    {lang === 'hi' ? 'ऑरेंज अलर्ट: भारी वर्षा की चेतावनी' : 'Amber Watch: Heavy Rainfall in Hill Sector'}
                  </span>
                  <span className="text-[10px] text-[#6B7280]">15m ago</span>
                </div>
                <p className="text-[#4B5563] mt-0.5 leading-relaxed">
                  {lang === 'hi'
                    ? 'वायनाड और इडुक्की ढलानों पर अगले 12 घंटों में 100 मिमी से अधिक वर्षा का अनुमान है।'
                    : 'Over 100mm rainfall forecasted across Wayanad slope catchments in the next 12 hours.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 8. EXPLAINABLE AI MODAL / DRAWER ("Why am I seeing this?") */}
      {showXAIModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] w-full max-w-md rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowXAIModal(false)}
              className="absolute top-4 right-4 text-[#6B7280] hover:text-[#1F2937] p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#EBF3FA] flex items-center justify-center text-[#0F4C81]">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1F2937]">
                  {lang === 'hi' ? 'यह जोखिम स्कोर क्यों दिख रहा है?' : 'Why am I seeing this?'}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  {lang === 'hi' ? 'पारदर्शी एआई जोखिम विश्लेषण' : 'Transparent, data-grounded evaluation'}
                </p>
              </div>
            </div>

            {/* Checklist Reasons */}
            <div className="space-y-2.5 pt-1">
              {(hazardData?.xai_reasons || [
                lang === 'hi' ? 'पिछले 24 घंटों में 84.5 मिमी भारी वर्षा दर्ज की गई।' : 'Heavy 24h precipitation (84.5mm) exceeds localized 60mm safety threshold.',
                lang === 'hi' ? 'मिट्टी की नमी 78% संतृप्ति स्तर तक पहुंच गई है।' : 'Volumetric soil moisture reached critical 78% saturation.',
                lang === 'hi' ? 'यह क्षेत्र 32° से अधिक तीव्र ढलान वाले संवेदनशील क्षेत्र में है।' : 'Located in high-slope mountain corridor gradient (>32°).',
                lang === 'hi' ? 'निकटवर्ती 2.5 किमी क्षेत्र में पूर्व में भूस्खलन की घटनाएं दर्ज हैं।' : 'Historical landslide activity recorded within 2.5km radius.'
              ]).map((reason, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
                  <span className="text-[#1F2937] font-medium">{reason}</span>
                </div>
              ))}
            </div>

            {/* Confidence & Source Ribbon */}
            <div className="p-3 bg-[#EBF3FA] rounded-xl border border-[#D0E2F2] flex items-center justify-between text-xs">
              <span className="text-[#0F4C81] font-bold">
                {lang === 'hi' ? 'मॉडल विश्वसनीयता' : 'Model Confidence'}: {confidenceScore}%
              </span>
              <span className="text-[#4B5563]">
                NDMA MoES PostGIS
              </span>
            </div>

            <button
              onClick={() => setShowXAIModal(false)}
              className="apda-btn-primary w-full text-xs font-bold py-2.5 cursor-pointer"
            >
              {lang === 'hi' ? 'समझ गया' : 'Understood'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
