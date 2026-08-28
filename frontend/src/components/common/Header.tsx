'use client';

import React from 'react';
import { Shield, Globe, User, PhoneCall, Radio, ChevronDown } from 'lucide-react';

interface HeaderProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
  lang: 'en' | 'hi';
  onLangToggle: () => void;
  onOpenLogin: () => void;
  isEmergencyActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  lang,
  onLangToggle,
  onOpenLogin,
  isEmergencyActive = false,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-4 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Government Identity */}
        <div className="flex items-center space-x-3">
          {/* Government Emblem / Crest */}
          <div className="w-10 h-10 rounded-xl bg-[#0F4C81] flex items-center justify-center text-white shadow-sm shrink-0 border border-[#0C3D68]">
            <Shield className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-[#1F2937] tracking-tight leading-none">
                {lang === 'hi' ? 'आपदा मित्र' : 'Apda Mitra'}
              </h1>
              <span className="bg-[#EBF3FA] text-[#0F4C81] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D0E2F2]">
                NDMA • MoES
              </span>
            </div>
            <p className="text-[11px] text-[#6B7280] font-medium mt-0.5 hidden xs:block">
              {lang === 'hi'
                ? 'राष्ट्रीय आपदा आसूचना एवं प्रबंधन मंच'
                : "India's Disaster Intelligence Platform"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Live Status Indicator */}
          <div className="hidden md:flex items-center space-x-1.5 bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-full text-xs">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
            <span className="text-[#4B5563] font-medium text-[11px]">
              {lang === 'hi' ? 'लाइव उपग्रह डेटा' : 'Live Satellite Feeds'}
            </span>
          </div>

          {/* Quick SOS Helpline Call */}
          <a
            href="tel:112"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] border border-[#EF9A9A] rounded-lg text-xs font-bold transition-colors"
            title="Emergency Police & Disaster Helpline"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">112 Helpline</span>
            <span className="sm:hidden">112</span>
          </a>

          {/* Language Switcher */}
          <button
            onClick={onLangToggle}
            className="px-2.5 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1F2937] text-xs font-semibold rounded-lg border border-[#CBD5E1] transition-colors flex items-center space-x-1"
            title="Switch Language / भाषा बदलें"
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5 text-[#0F4C81]" />
            <span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
          </button>

          {/* Role Switcher */}
          <div className="relative">
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value)}
              className="appearance-none bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#1F2937] text-xs font-semibold border border-[#CBD5E1] rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:border-[#0F4C81] cursor-pointer transition-colors"
            >
              <option value="citizen">👤 {lang === 'hi' ? 'नागरिक दृश्य' : 'Citizen View'}</option>
              <option value="officer">🛡️ {lang === 'hi' ? 'नियंत्रण कक्ष (EOC)' : 'District EOC Officer'}</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Login / Profile */}
          <button
            onClick={onOpenLogin}
            className="p-1.5 sm:px-3 sm:py-1.5 bg-[#0F4C81] hover:bg-[#0C3D68] text-white text-xs font-semibold rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors"
            title="Officer & Citizen Login"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'hi' ? 'लॉगिन' : 'Sign In'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
