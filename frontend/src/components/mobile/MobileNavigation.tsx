'use client';

import React from 'react';
import { Home, Map, AlertTriangle, Camera, User, PhoneCall, ShieldAlert } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenSOS: () => void;
  lang?: 'en' | 'hi';
}

export const MobileNavigation: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  onOpenSOS,
  lang = 'en',
}) => {
  const tabs = [
    { id: 'home', label: lang === 'hi' ? 'होम' : 'Home', icon: Home },
    { id: 'map', label: lang === 'hi' ? 'मानचित्र' : 'Map', icon: Map },
    { id: 'alerts', label: lang === 'hi' ? 'अलर्ट' : 'Alerts', icon: AlertTriangle },
    { id: 'report', label: lang === 'hi' ? 'रिपोर्ट' : 'Report', icon: Camera },
    { id: 'profile', label: lang === 'hi' ? 'प्रोफ़ाइल' : 'Profile', icon: User },
  ];

  return (
    <>
      {/* Floating Thumb-Zone Emergency SOS Trigger (56dp target) */}
      <button
        onClick={onOpenSOS}
        className="fixed bottom-20 right-4 sm:right-8 z-40 w-14 h-14 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-full shadow-2xl border-2 border-white flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer emergency-pulse"
        title="Emergency SOS 112 Dispatch"
        aria-label="Emergency SOS"
      >
        <ShieldAlert className="w-6 h-6 text-white" />
        <span className="text-[9px] font-black uppercase tracking-tighter text-white">SOS</span>
      </button>

      {/* 5-Item Thumb-Friendly Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] px-2 py-1 flex items-center justify-around shadow-lg">
        <div className="max-w-md w-full mx-auto flex items-center justify-around">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all cursor-pointer min-h-[50px] ${
                  isActive
                    ? 'text-[#0F4C81] font-bold'
                    : 'text-[#6B7280] hover:text-[#1F2937]'
                }`}
                aria-label={t.label}
              >
                <div
                  className={`w-10 h-7 rounded-full flex items-center justify-center transition-colors ${
                    isActive ? 'bg-[#EBF3FA]' : 'bg-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#0F4C81]' : 'text-[#6B7280]'}`} />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight font-medium">
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
