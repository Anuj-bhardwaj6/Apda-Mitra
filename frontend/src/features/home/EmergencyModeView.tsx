'use client';

import React, { useState } from 'react';
import { ShieldAlert, Navigation, PhoneCall, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ShelterItem } from '@/shared/types';

interface EmergencyModeViewProps {
  nearestShelter: ShelterItem;
  locationName: string;
  onOpenShareStatus: () => void;
  lang: 'en' | 'hi';
}

export const EmergencyModeView: React.FC<EmergencyModeViewProps> = ({
  nearestShelter,
  locationName,
  onOpenShareStatus,
  lang,
}) => {
  return (
    <div className="w-full space-y-3.5 animate-in fade-in zoom-in-95">
      {/* 1. Calm Breathing Emergency Alert Banner (Accessible Red) */}
      <div className="p-4 sm:p-5 rounded-[28px] bg-[#FFEBEE] dark:bg-[#3B1212] border-2 border-[#D32F2F] shadow-xl text-[#1F2937] dark:text-white space-y-3 relative overflow-hidden">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-[#D32F2F] animate-ping" />
          <span className="text-xs font-black uppercase tracking-wider text-[#D32F2F] dark:text-[#FF8A80]">
            {lang === 'hi' ? '🔴 उच्च स्तरीय आपदा चेतावनी सक्रिय' : '🔴 Severe Disaster Alert Active'}
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-black text-[#B71C1C] dark:text-[#FFCDD2] leading-tight">
          {lang === 'hi'
            ? 'वायनाड क्षेत्र में तीव्र भूस्खलन और जलभराव का खतरा है। तुरंत सुरक्षित स्थान पर जाएँ।'
            : 'Immediate Flash Flood & Landslide Rupture Detected. Evacuate to Verified Shelter.'}
        </h2>

        <p className="text-xs text-[#4B5563] dark:text-[#E0E0E0]">
          {lang === 'hi'
            ? 'प्रशासन द्वारा राहत कार्य जारी है। अनावश्यक यात्रा बिल्कुल न करें।'
            : 'National Disaster Response Force (NDRF) & District EOC active.'}
        </p>

        {/* 2. Giant SOS 112 Dispatch Action */}
        <a
          href="tel:112"
          className="w-full min-h-[56px] bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-2xl text-base font-black flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <PhoneCall className="w-6 h-6 animate-bounce" />
          <span>{lang === 'hi' ? '🚨 आपातकालीन 112 पर तुरंत कॉल करें' : '🚨 CALL 112 EMERGENCY SOS'}</span>
        </a>
      </div>

      {/* 3. Evacuation Shelter Direct Route */}
      <div className="p-4 rounded-[24px] bg-white dark:bg-[#131D2A] border border-[#CBD5E1] dark:border-[#24344B] shadow-md space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#2E7D32] dark:text-[#81C784]">
              {lang === 'hi' ? 'निकटतम सुरक्षित राहत शिविर' : 'Primary Safe Evacuation Target'}
            </span>
            <h4 className="text-sm sm:text-base font-black text-[#1F2937] dark:text-white">
              {nearestShelter.name}
            </h4>
          </div>
          <span className="text-xs font-black text-[#2E7D32] bg-[#E8F5E9] dark:bg-[#1A3320] px-2.5 py-1 rounded-full shrink-0">
            {nearestShelter.distanceKm} km ({nearestShelter.etaMins} mins)
          </span>
        </div>

        <button
          onClick={() => {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${nearestShelter.latitude},${nearestShelter.longitude}`, '_blank');
          }}
          className="w-full min-h-[48px] bg-[#0F4C81] hover:bg-[#0C3D68] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
          <span>{lang === 'hi' ? 'शिविर का सुरक्षित मार्ग शुरू करें' : 'Start Evacuation Navigation'}</span>
        </button>
      </div>

      {/* 4. Family Beacon: Share My Status Controlled Trigger */}
      <button
        onClick={onOpenShareStatus}
        className="w-full min-h-[48px] bg-white dark:bg-[#1B2738] hover:bg-[#F8FAFC] text-[#1F2937] dark:text-white border border-[#CBD5E1] dark:border-[#24344B] rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer"
      >
        <Users className="w-4 h-4 text-[#0F4C81] dark:text-[#81D4FA]" />
        <span>{lang === 'hi' ? '👨‍👩‍👧 परिवार को अपनी सुरक्षा स्थिति भेजें' : '👨‍👩‍👧 Share My Status with Family'}</span>
      </button>
    </div>
  );
};
