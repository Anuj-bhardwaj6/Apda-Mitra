'use client';

import React from 'react';
import { CloudRain, Home, ShieldAlert, Navigation, Mic, Camera, Bookmark } from 'lucide-react';

interface QuickActionChipsProps {
  onSelectAction: (action: 'weather' | 'shelter' | 'emergency' | 'journey' | 'voice' | 'report') => void;
  lang: 'en' | 'hi';
}

export const QuickActionChips: React.FC<QuickActionChipsProps> = ({
  onSelectAction,
  lang,
}) => {
  const chips = [
    {
      id: 'emergency' as const,
      label: lang === 'hi' ? 'आपातकाल 112' : 'SOS 112',
      icon: ShieldAlert,
      bg: 'bg-[#FFEBEE] dark:bg-[#381515] border-[#FFCDD2] dark:border-[#6B2020] text-[#D32F2F] dark:text-[#EF9A9A]',
      iconBg: 'bg-[#D32F2F] text-white',
    },
    {
      id: 'journey' as const,
      label: lang === 'hi' ? 'सुरक्षित यात्रा' : 'Safe Trip',
      icon: Navigation,
      bg: 'bg-[#EBF3FA] dark:bg-[#1B2738] border-[#D0E2F2] dark:border-[#24344B] text-[#0F4C81] dark:text-[#81D4FA]',
      iconBg: 'bg-[#0F4C81] text-white',
    },
    {
      id: 'voice' as const,
      label: lang === 'hi' ? 'वॉइस एआई' : 'Voice AI',
      icon: Mic,
      bg: 'bg-[#F3E5F5] dark:bg-[#2A1730] border-[#E1BEE7] dark:border-[#4A2454] text-[#7B1FA2] dark:text-[#CE93D8]',
      iconBg: 'bg-[#7B1FA2] text-white',
    },
    {
      id: 'shelter' as const,
      label: lang === 'hi' ? 'राहत शिविर' : 'Shelters',
      icon: Home,
      bg: 'bg-[#E8F5E9] dark:bg-[#162A1B] border-[#C8E6C9] dark:border-[#265330] text-[#2E7D32] dark:text-[#A5D6A7]',
      iconBg: 'bg-[#2E7D32] text-white',
    },
    {
      id: 'weather' as const,
      label: lang === 'hi' ? 'मौसम' : 'Weather',
      icon: CloudRain,
      bg: 'bg-[#F8FAFC] dark:bg-[#131D2A] border-[#E2E8F0] dark:border-[#24344B] text-[#1F2937] dark:text-white',
      iconBg: 'bg-[#E2E8F0] dark:bg-[#24344B] text-[#0F4C81] dark:text-[#81D4FA]',
    },
    {
      id: 'report' as const,
      label: lang === 'hi' ? 'घटना रिपोर्ट' : 'Report',
      icon: Camera,
      bg: 'bg-[#F8FAFC] dark:bg-[#131D2A] border-[#E2E8F0] dark:border-[#24344B] text-[#1F2937] dark:text-white',
      iconBg: 'bg-[#E2E8F0] dark:bg-[#24344B] text-[#4B5563] dark:text-[#9CA3AF]',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center space-x-2.5 overflow-x-auto pb-1 no-scrollbar select-none">
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <button
              key={chip.id}
              onClick={() => onSelectAction(chip.id)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl border transition-all active:scale-95 cursor-pointer shrink-0 min-h-[48px] shadow-xs ${chip.bg}`}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${chip.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold whitespace-nowrap">
                {chip.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
