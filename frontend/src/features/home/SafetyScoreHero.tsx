'use client';

import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, ChevronRight, HelpCircle, Navigation, Info, X } from 'lucide-react';
import { SafetyScore } from '@/shared/types/disaster';

interface SafetyScoreHeroProps {
  score: SafetyScore;
  onNavigateToShelter: () => void;
  lang: 'en' | 'hi';
}

export const SafetyScoreHero: React.FC<SafetyScoreHeroProps> = ({
  score,
  onNavigateToShelter,
  lang,
}) => {
  const [showXAIModal, setShowXAIModal] = useState(false);

  const isSafe = score.level === 'safe';
  const isAlert = score.level === 'alert';
  const isAction = score.level === 'action';

  const badgeColor = isSafe
    ? 'bg-[#2E7D32] text-white'
    : isAlert
    ? 'bg-[#E65100] text-white'
    : 'bg-[#D32F2F] text-white';

  const cardBorder = isSafe
    ? 'border-[#A5D6A7] bg-[#E8F5E9]/60 dark:bg-[#142918]/60 dark:border-[#204E26]'
    : isAlert
    ? 'border-[#FFE082] bg-[#FFF3E0]/70 dark:bg-[#332211]/70 dark:border-[#5A3816]'
    : 'border-[#FFCDD2] bg-[#FFEBEE]/80 dark:bg-[#3D1414]/80 dark:border-[#6B2020] animate-pulse';

  return (
    <>
      <div className={`p-4 sm:p-5 rounded-[24px] border transition-all duration-300 shadow-sm ${cardBorder}`}>
        {/* Top: Status Badge & Freshness */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide shadow-xs ${badgeColor}`}>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>{lang === 'hi' ? score.badgeHi : score.badge}</span>
            </span>
          </div>

          <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] font-medium">
            {lang === 'hi' ? '18 सेकंड पहले अद्यतन' : 'Updated 18s ago'}
          </span>
        </div>

        {/* Headline & Subhead (Human Microcopy) */}
        <div className="mt-3 space-y-1">
          <h1 className="text-lg sm:text-xl font-extrabold text-[#1F2937] dark:text-white leading-snug">
            {lang === 'hi' ? score.headlineHi : score.headline}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#4B5563] dark:text-[#CBD5E1] leading-relaxed">
            {lang === 'hi' ? score.subheadHi : score.subhead}
          </p>
        </div>

        {/* "Why?" Factors Summary Row */}
        <div className="mt-3.5 pt-3 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-1.5 flex-wrap">
            <span className="font-bold text-[#1F2937] dark:text-white">
              {lang === 'hi' ? 'कारण:' : 'Why?'}
            </span>
            {score.factors.map((f, i) => (
              <span
                key={i}
                className="bg-white/80 dark:bg-black/30 px-2 py-0.5 rounded-md text-[11px] font-semibold text-[#4B5563] dark:text-[#D1D5DB] border border-black/5 dark:border-white/5"
              >
                {lang === 'hi' ? f.titleHi : f.title}
              </span>
            ))}
          </div>

          <button
            onClick={() => setShowXAIModal(true)}
            className="text-[11px] font-bold text-[#0F4C81] dark:text-[#81D4FA] hover:underline flex items-center cursor-pointer"
          >
            <span>{lang === 'hi' ? 'विवरण देखें' : 'View Details'}</span>
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => setShowXAIModal(true)}
            className="min-h-[46px] px-3 py-2 bg-white dark:bg-[#1B2738] hover:bg-[#F8FAFC] dark:hover:bg-[#24344B] text-[#1F2937] dark:text-white border border-[#CBD5E1] dark:border-[#24344B] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-[#0F4C81] dark:text-[#81D4FA]" />
            <span>{lang === 'hi' ? 'यह क्यों दिख रहा है?' : 'Learn Why'}</span>
          </button>

          <button
            onClick={onNavigateToShelter}
            className="min-h-[46px] px-3 py-2 bg-[#0F4C81] hover:bg-[#0C3D68] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            <span>{lang === 'hi' ? 'सुरक्षित आश्रय स्थल जाएं' : 'Navigate to Safe Shelter'}</span>
          </button>
        </div>
      </div>

      {/* Explainable AI Modal ("Why am I seeing this?") */}
      {showXAIModal && (
        <div className="app-modal-overlay fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
          <div className="bg-white dark:bg-[#131D2A] border border-[#CBD5E1] dark:border-[#24344B] w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4 relative animate-in fade-in zoom-in-95 text-[#1F2937] dark:text-white">
            <button
              onClick={() => setShowXAIModal(false)}
              className="absolute top-4 right-4 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1F2937] p-1 rounded-full cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#EBF3FA] dark:bg-[#1B2738] flex items-center justify-center text-[#0F4C81] dark:text-[#81D4FA]">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  {lang === 'hi' ? 'जोखिम विश्लेषण विवरण' : 'Safety Assessment Breakdown'}
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  {lang === 'hi' ? 'पारदर्शी एआई जोखिम मूल्यांकन' : 'Data-grounded multi-factor evaluation'}
                </p>
              </div>
            </div>

            {/* Factors Checklist */}
            <div className="space-y-2 pt-1">
              {score.factors.map((factor, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B] flex items-center justify-between text-xs"
                >
                  <span className="font-bold">{lang === 'hi' ? factor.titleHi : factor.title}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                    factor.severity === 'high'
                      ? 'bg-[#FFCDD2] text-[#B71C1C]'
                      : factor.severity === 'medium'
                      ? 'bg-[#FFE082] text-[#E65100]'
                      : 'bg-[#C8E6C9] text-[#1B5E20]'
                  }`}>
                    {factor.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-[#EBF3FA] dark:bg-[#1B2738] rounded-xl text-[11px] text-[#0F4C81] dark:text-[#81D4FA] font-medium">
              {lang === 'hi'
                ? 'स्रोत: एनडीएमए भूस्खलन मॉडल एवं भारतीय मौसम विज्ञान विभाग'
                : 'Verified via NDMA Landslide Model & India Meteorological Department (IMD)'}
            </div>

            <button
              onClick={() => setShowXAIModal(false)}
              className="w-full py-3 bg-[#0F4C81] hover:bg-[#0C3D68] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {lang === 'hi' ? 'समझ गया' : 'Understood'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
