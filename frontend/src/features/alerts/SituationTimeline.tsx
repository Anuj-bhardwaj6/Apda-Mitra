'use client';

import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { TimelineEvent, CommunityReport, DisasterAppMode } from '@/shared/types/disaster';

interface SituationTimelineProps {
  events: TimelineEvent[];
  reports: CommunityReport[];
  appMode: DisasterAppMode;
  lang: 'en' | 'hi';
}

export const SituationTimeline: React.FC<SituationTimelineProps> = ({
  events,
  reports,
  appMode,
  lang,
}) => {
  // 1. Positive Empty State for Normal Mode
  if (appMode === 'normal') {
    return (
      <div className="w-full p-4 sm:p-5 rounded-[24px] bg-white dark:bg-[#131D2A] border border-[#E2E8F0] dark:border-[#24344B] shadow-sm text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-[#E8F5E9] dark:bg-[#1A3320] text-[#2E7D32] dark:text-[#A5D6A7] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[#1F2937] dark:text-white">
          {lang === 'hi' ? '✅ शुभ समाचार!' : '✅ Good news!'}
        </h3>
        <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
          {lang === 'hi'
            ? 'आपके क्षेत्र में कोई सक्रिय आपदा अलर्ट नहीं है। स्थिति पूरी तरह सामान्य है।'
            : 'There are no active disaster alerts in your sector. Situation is stable.'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-5 rounded-[24px] bg-white dark:bg-[#131D2A] border border-[#E2E8F0] dark:border-[#24344B] shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[#0F4C81] dark:text-[#81D4FA]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937] dark:text-white">
            {lang === 'hi' ? 'आपदा घटनाक्रम एवं समुदाय सत्यापन' : 'Situation Timeline & Community Verification'}
          </h3>
        </div>
        <span className="text-[10px] bg-[#EBF3FA] dark:bg-[#1B2738] text-[#0F4C81] dark:text-[#81D4FA] font-bold px-2 py-0.5 rounded-full border border-[#D0E2F2] dark:border-[#24344B]">
          Live Feed
        </span>
      </div>

      {/* Chronological Timeline Sequence */}
      <div className="relative pl-4 border-l-2 border-[#CBD5E1] dark:border-[#24344B] space-y-4">
        {events.map((ev) => (
          <div key={ev.id} className="relative group">
            {/* Timeline Dot */}
            <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#131D2A] ${
              ev.severity === 'red'
                ? 'bg-[#D32F2F] ring-2 ring-red-200'
                : ev.severity === 'orange'
                ? 'bg-[#E65100]'
                : 'bg-[#0F4C81]'
            }`} />

            <div className="flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
              <span className="font-bold text-[#1F2937] dark:text-white">{ev.time}</span>
              <span>{ev.source}</span>
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-[#1F2937] dark:text-white mt-0.5">
              {lang === 'hi' ? ev.titleHi : ev.title}
            </h4>
            <p className="text-[11px] text-[#4B5563] dark:text-[#CBD5E1] mt-0.5">
              {lang === 'hi' ? ev.descriptionHi : ev.description}
            </p>
          </div>
        ))}
      </div>

      {/* Community Verified Reports Section */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block">
          {lang === 'hi' ? 'नागरिक एवं पुलिस सत्यापित रिपोर्ट' : 'Community & Police Verified Reports'}
        </span>

        {reports.map((rep) => (
          <div
            key={rep.id}
            className="p-3 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B] space-y-1 text-xs"
          >
            <div className="flex items-start justify-between">
              <span className="font-bold text-[#1F2937] dark:text-white">
                {lang === 'hi' ? rep.titleHi : rep.title}
              </span>
              <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] shrink-0">
                {rep.timeAgo}
              </span>
            </div>

            <div className="flex items-center space-x-2 flex-wrap text-[11px]">
              <span className="text-[#2E7D32] dark:text-[#81C784] font-bold flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {lang === 'hi' ? `${rep.verifiedCount} नागरिकों द्वारा सत्यापित` : `Verified by ${rep.verifiedCount} citizens`}
              </span>

              {rep.policeConfirmed && (
                <span className="bg-[#EBF3FA] dark:bg-[#1A2634] text-[#0F4C81] dark:text-[#81D4FA] font-bold px-2 py-0.2 rounded-full border border-[#D0E2F2] dark:border-[#24344B]">
                  🛡️ {lang === 'hi' ? 'पुलिस द्वारा पुष्ट' : 'Police Confirmed'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
