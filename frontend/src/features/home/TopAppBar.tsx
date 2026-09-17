'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Bell, Globe, Moon, Sun, ShieldAlert, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { DisasterAppMode } from '@/shared/types/disaster';

interface TopAppBarProps {
  districtName: string;
  appMode: DisasterAppMode;
  lang: 'en' | 'hi';
  isDarkMode: boolean;
  onToggleLang: () => void;
  onToggleDarkMode: () => void;
  onOpenJudgeHUD: () => void;
  onOpenLocationSearch: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  districtName,
  appMode,
  lang,
  isDarkMode,
  onToggleLang,
  onToggleDarkMode,
  onOpenJudgeHUD,
  onOpenLocationSearch,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [longPressActive, setLongPressActive] = useState(false);

  // 800ms Long Press on Crest Logo triggers the Judge Diagnostic HUD
  const handleTouchStart = () => {
    setLongPressActive(true);
    longPressTimer.current = setTimeout(() => {
      onOpenJudgeHUD();
      setLongPressActive(false);
    }, 800);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setLongPressActive(false);
  };

  return (
    <header
      className={`h-[72px] px-4 sticky top-0 z-40 flex items-center justify-between border-b transition-colors duration-300 ${
        appMode === 'disaster'
          ? 'bg-[#B71C1C] border-[#8E0000] text-white'
          : isDarkMode
          ? 'bg-[#131D2A] border-[#24344B] text-white'
          : 'bg-white border-[#E5E7EB] text-[#1F2937]'
      }`}
    >
      {/* 1. Official Crest Logo & District Pill (Thumb-friendly & Long Press for Judge HUD) */}
      <div className="flex items-center space-x-2.5">
        <div
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`relative w-11 h-11 rounded-2xl overflow-hidden cursor-pointer select-none transition-transform active:scale-95 shadow-sm border ${
            appMode === 'disaster' ? 'border-white/40' : 'border-[#CBD5E1]'
          } ${longPressActive ? 'scale-90 ring-2 ring-[#0F4C81]' : ''}`}
          title="Apda Mitra - Long press for Judge Diagnostic HUD"
        >
          <Image
            src="/apda_logo.png"
            alt="Apda Mitra Official Crest"
            fill
            sizes="44px"
            className="object-cover"
            priority
          />
        </div>

        {/* District Status Pill */}
        <button
          onClick={onOpenLocationSearch}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
            appMode === 'disaster'
              ? 'bg-black/25 text-white border border-white/30'
              : isDarkMode
              ? 'bg-[#1B2738] text-white border border-[#24344B]'
              : 'bg-[#F1F5F9] text-[#1F2937] hover:bg-[#E2E8F0] border border-[#CBD5E1]'
          }`}
          aria-label="Change Location"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              appMode === 'disaster'
                ? 'bg-white animate-ping'
                : appMode === 'warning'
                ? 'bg-[#E65100] animate-pulse'
                : 'bg-[#2E7D32]'
            }`}
          />
          <span className="truncate max-w-[130px] sm:max-w-[180px]">
            {districtName}
          </span>
        </button>
      </div>

      {/* 2. Top Right Actions: Language, Theme, and Notifications */}
      <div className="flex items-center space-x-1.5">
        {/* Language Switcher */}
        <button
          onClick={onToggleLang}
          className={`min-w-[40px] h-10 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer ${
            appMode === 'disaster'
              ? 'bg-black/25 text-white hover:bg-black/40'
              : isDarkMode
              ? 'bg-[#1B2738] text-white hover:bg-[#24344B]'
              : 'bg-[#F8FAFC] text-[#1F2937] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
          }`}
          title="Switch Language / भाषा बदलें"
          aria-label="Switch Language"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'en' ? 'हिं' : 'EN'}</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
            appMode === 'disaster'
              ? 'bg-black/25 text-white hover:bg-black/40'
              : isDarkMode
              ? 'bg-[#1B2738] text-amber-300 hover:bg-[#24344B]'
              : 'bg-[#F8FAFC] text-[#4B5563] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
          }`}
          title="Toggle Theme"
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-[#0F4C81]" />}
        </button>

        {/* Notification Bell with Badge */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-colors cursor-pointer ${
              appMode === 'disaster'
                ? 'bg-white text-[#B71C1C] shadow-md'
                : isDarkMode
                ? 'bg-[#1B2738] text-white hover:bg-[#24344B]'
                : 'bg-[#F8FAFC] text-[#1F2937] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
            }`}
            title="Official Bulletins"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span
              className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                appMode === 'disaster' ? 'bg-[#D32F2F] animate-ping' : 'bg-[#E65100]'
              }`}
            />
          </button>

          {/* Quick Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#161F2E] border border-[#CBD5E1] dark:border-[#24344B] rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 text-[#1F2937] dark:text-white">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#24344B]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  {lang === 'hi' ? 'आधिकारिक सूचनाएं' : 'Official Bulletins'}
                </span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 text-[#6B7280] hover:text-[#1F2937] rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                <div className="p-2.5 rounded-xl bg-[#FFF3E0] dark:bg-[#2D2012] border border-[#FFE082] text-xs">
                  <span className="font-bold text-[#E65100] block">
                    {lang === 'hi' ? 'मौसम बुलेटिन: भारी वर्षा' : 'Heavy Rainfall Alert (NDMA)'}
                  </span>
                  <p className="text-[#4B5563] dark:text-amber-100 text-[11px] mt-0.5">
                    {lang === 'hi'
                      ? 'शाम 5 बजे के बाद पहाड़ी घाट से बचें।'
                      : 'Slope caution advised along Wayanad Ghat.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
