"use client";

import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  HelpCircle,
  CloudRain,
  Mountain,
  Droplets,
  History,
  Route,
} from "lucide-react";
import { Language, LOCALIZATION } from "@/constants/localization";

export type SafetyStatusTier = "safe" | "advisory" | "high_risk" | "take_action";

interface SafetyStatusCardProps {
  status?: SafetyStatusTier;
  locationName?: string;
  metrics?: {
    rainfallMm: number;
    slopeDeg: number;
    soilMoisturePercent: number;
    historicalIncidentsCount: number;
  };
  customTitle?: string;
  customDesc?: string;
  actionAdvice?: string;
  lang?: Language;
  onViewSafeRoute?: () => void;
  onWhyWarning?: () => void;
}

export function SafetyStatusCard({
  status = "safe",
  locationName = "Your Sector",
  metrics = {
    rainfallMm: 4.2,
    slopeDeg: 14,
    soilMoisturePercent: 38,
    historicalIncidentsCount: 0,
  },
  customTitle,
  customDesc,
  actionAdvice,
  lang = "en",
  onViewSafeRoute,
  onWhyWarning,
}: SafetyStatusCardProps) {
  const t = LOCALIZATION[lang];

  const statusConfig = {
    safe: {
      badge: lang === "en" ? "SAFE" : "सुरक्षित",
      badgeClass: "bg-[#E8F5E9] text-[#2E7D32]",
      indicatorDot: "bg-[#2E7D32]",
      bgSurface: "bg-white",
      title: customTitle || t.safeZoneTitle,
      situation: customDesc || t.safeZoneDesc,
      whatToDo: actionAdvice || (lang === "en" ? "Normal travel conditions. No evacuation action necessary." : "सामान्य यात्रा स्थिति। किसी विशेष कार्रवाई की आवश्यकता नहीं।"),
      btnText: lang === "en" ? "Explore Nearby Safe Havens" : "सुरक्षित केंद्र देखें",
      btnClass: "bg-[#0F4C81] hover:bg-[#0A365C] text-white",
      accentBorder: "border-l-4 border-l-[#2E7D32]",
    },
    advisory: {
      badge: lang === "en" ? "STAY ALERT" : "सतर्क रहें",
      badgeClass: "bg-[#FEF3C7] text-[#B45309]",
      indicatorDot: "bg-[#F59E0B]",
      bgSurface: "bg-white",
      title: customTitle || t.stayAlertTitle,
      situation: customDesc || (lang === "en" ? "Heavy rainfall may increase landslide risk in your area this evening." : "भारी बारिश से आज शाम पहाड़ी ढलानों पर भूस्खलन का खतरा बढ़ सकता है।"),
      whatToDo: actionAdvice || (lang === "en" ? "Consider avoiding steep mountain roads after 5 PM." : "शाम 5 बजे के बाद पहाड़ी ढलानों और कच्ची सड़कों से बचें।"),
      btnText: lang === "en" ? "VIEW SAFE ROUTE" : "सुरक्षित मार्ग देखें",
      btnClass: "bg-[#0F4C81] hover:bg-[#0A365C] text-white shadow-xs",
      accentBorder: "border-l-4 border-l-[#F59E0B]",
    },
    high_risk: {
      badge: lang === "en" ? "HIGH RISK" : "उच्च जोखिम",
      badgeClass: "bg-[#FFEDD5] text-[#C2410C]",
      indicatorDot: "bg-[#EA580C]",
      bgSurface: "bg-white",
      title: customTitle || t.highRiskTitle,
      situation: customDesc || (lang === "en" ? "Continuous precipitation has saturated upper hill slopes. Active rockfall reported." : "लगातार वर्षा से ढलान कमजोर हैं। पत्थरों का गिरना दर्ज किया गया है।"),
      whatToDo: actionAdvice || (lang === "en" ? "Non-essential travel restricted. Follow bypass corridors to high ground." : "गैर-जरूरी यात्रा से बचें। बाईपास मार्ग से सुरक्षित ऊंचे स्थान पर जाएं।"),
      btnText: lang === "en" ? "VIEW SAFE ROUTE" : "सुरक्षित मार्ग देखें",
      btnClass: "bg-[#C62828] hover:bg-[#B71C1C] text-white shadow-sm",
      accentBorder: "border-l-4 border-l-[#EA580C]",
    },
    take_action: {
      badge: lang === "en" ? "TAKE ACTION" : "कार्रवाई करें",
      badgeClass: "bg-[#FFEBEE] text-[#C62828] animate-pulse",
      indicatorDot: "bg-[#C62828]",
      bgSurface: "bg-[#FFF5F5]",
      title: customTitle || t.takeActionTitle,
      situation: customDesc || (lang === "en" ? "Immediate slope failure risk. Debris flow initiated in valley cuttings." : "तत्काल भूस्खलन का गंभीर खतरा। घाटी में मलबा बहना शुरू हो गया है।"),
      whatToDo: actionAdvice || (lang === "en" ? "Evacuate immediately to designated relief center along West Ridge." : "तुरंत पश्चिमी कटक मार्ग से सुरक्षित राहत केंद्र की ओर प्रस्थान करें।"),
      btnText: lang === "en" ? "EVACUATE TO NEAREST SHELTER" : "निकटतम सुरक्षित शिविर की ओर बढ़ें",
      btnClass: "bg-[#C62828] hover:bg-[#991B1B] text-white shadow-md",
      accentBorder: "border-l-4 border-l-[#C62828]",
    },
  }[status];

  return (
    <section
      className={`rounded-3xl p-5 sm:p-6 border border-[#E4E7EC] shadow-card transition-all ${statusConfig.bgSurface} ${statusConfig.accentBorder}`}
      aria-label="Safety status"
    >
      {/* 1. Status Pill & Sector */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase ${statusConfig.badgeClass}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusConfig.indicatorDot}`} />
            {statusConfig.badge}
          </span>
        </div>

        <span className="text-xs font-bold text-[#5F6D7E] truncate">
          📍 {locationName}
        </span>
      </div>

      {/* 2. What is Happening (Authoritative Situation) */}
      <div className="mt-3.5">
        <h2 className="text-2xl sm:text-3xl font-black text-[#16202A] tracking-tight leading-tight">
          {statusConfig.title}
        </h2>
        <p className="mt-1.5 text-base font-semibold text-[#16202A] leading-relaxed">
          {statusConfig.situation}
        </p>
      </div>

      {/* 3. What Should I Do? (Immediate Plain-Language Action Guidance) */}
      <div className="mt-4 pt-3 border-t border-[#E4E7EC]/70 space-y-1">
        <span className="text-xs font-black uppercase tracking-wider text-[#5F6D7E]">
          {lang === "en" ? "What should you do?" : "आपको क्या करना चाहिए?"}
        </span>
        <p className="text-sm font-medium text-[#16202A] leading-snug">
          👉 {statusConfig.whatToDo}
        </p>
      </div>

      {/* 4. Primary CTA + Secondary Link */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <button
          onClick={onViewSafeRoute}
          type="button"
          className={`py-3.5 px-6 rounded-2xl font-black text-sm tracking-wide transition flex items-center justify-center gap-2 active:scale-98 ${statusConfig.btnClass}`}
        >
          <Route className="w-4 h-4" />
          <span>{statusConfig.btnText}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onWhyWarning}
          type="button"
          className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center justify-center gap-1 py-1"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{t.whyThisWarning}</span>
        </button>
      </div>

      {/* 5. Minimalist Telemetry Indicators (No Box-in-a-Box Clutter) */}
      <div className="mt-5 pt-3 border-t border-[#E4E7EC]/60 grid grid-cols-4 gap-2 text-center text-xs">
        <div>
          <span className="text-[10px] font-bold text-[#5F6D7E] block uppercase">{t.rainfall}</span>
          <span className="font-extrabold text-[#16202A] text-xs sm:text-sm">{metrics.rainfallMm} mm</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-[#5F6D7E] block uppercase">{t.slope}</span>
          <span className="font-extrabold text-[#16202A] text-xs sm:text-sm">{metrics.slopeDeg}°</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-[#5F6D7E] block uppercase">{t.soilMoisture}</span>
          <span className="font-extrabold text-[#16202A] text-xs sm:text-sm">{metrics.soilMoisturePercent}%</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-[#5F6D7E] block uppercase">{t.history}</span>
          <span className="font-extrabold text-[#16202A] text-xs sm:text-sm">{metrics.historicalIncidentsCount} {lang === "en" ? "events" : "घटनाएँ"}</span>
        </div>
      </div>
    </section>
  );
}
