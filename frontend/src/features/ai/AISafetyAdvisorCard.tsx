'use client';

import React from 'react';
import { Sparkles, Mic, Navigation } from 'lucide-react';

interface AISafetyAdvisorCardProps {
  onPlanTrip: () => void;
  onOpenVoice: () => void;
  lang: 'en' | 'hi';
}

export const AISafetyAdvisorCard: React.FC<AISafetyAdvisorCardProps> = ({
  onPlanTrip,
  onOpenVoice,
  lang,
}) => {
  return (
    <div className="w-full p-4 sm:p-5 rounded-[24px] bg-gradient-to-br from-[#EBF3FA] via-white to-[#F0F4F8] dark:from-[#1A2634] dark:via-[#131D2A] dark:to-[#162230] border border-[#D0E2F2] dark:border-[#24344B] shadow-sm space-y-3">
      {/* Header with Sparkle Icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-[#0F4C81] dark:bg-[#81D4FA] text-white dark:text-[#0F4C81] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F4C81] dark:text-[#81D4FA]">
            {lang === 'hi' ? 'एआई सुरक्षा सलाहकार' : 'AI Safety Advisor'}
          </span>
        </div>

        <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] font-bold">
          Proactive Guidance
        </span>
      </div>

      {/* Human Proactive Advice Copy */}
      <div className="space-y-1">
        <h4 className="text-sm sm:text-base font-extrabold text-[#1F2937] dark:text-white leading-snug">
          {lang === 'hi'
            ? 'शुभ दोपहर। शाम 5 बजे के बाद भारी बारिश का अनुमान है।'
            : 'Good afternoon. Heavy rainfall is expected after 5 PM.'}
        </h4>
        <p className="text-xs text-[#4B5563] dark:text-[#CBD5E1]">
          {lang === 'hi'
            ? 'क्या आप घर पहुँचने के लिए सबसे सुरक्षित मार्ग की योजना बनाना चाहते हैं?'
            : 'Would you like me to plan the safest route home?'}
        </p>
      </div>

      {/* 2 Thumb-Friendly Actions */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={onPlanTrip}
          className="py-2.5 px-3 bg-[#0F4C81] hover:bg-[#0C3D68] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-all cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>{lang === 'hi' ? 'सुरक्षित मार्ग खोजें' : 'Plan Safe Route'}</span>
        </button>

        <button
          onClick={onOpenVoice}
          className="py-2.5 px-3 bg-white dark:bg-[#1B2738] hover:bg-[#F8FAFC] text-[#0F4C81] dark:text-[#81D4FA] border border-[#CBD5E1] dark:border-[#24344B] rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{lang === 'hi' ? 'वॉइस से पूछें' : 'Ask Voice AI'}</span>
        </button>
      </div>
    </div>
  );
};
