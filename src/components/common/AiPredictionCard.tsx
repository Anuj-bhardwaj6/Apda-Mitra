"use client";

import React from "react";
import { Sparkles, Route, MessageSquare, ShieldCheck, ArrowRight } from "lucide-react";
import { Language, LOCALIZATION } from "@/constants/localization";

interface AiSafetyAdvisorProps {
  guidance?: {
    text: string;
    recommendation: string;
    validUntil: string;
  };
  lang?: Language;
  onPlanSafeRoute?: () => void;
  onAskAi?: () => void;
}

export function AiPredictionCard({
  guidance = {
    text: "Rainfall is expected to increase this evening.",
    recommendation: "Avoid low-lying roads and steep cut slopes after 6 PM.",
    validUntil: "Valid until 11:00 PM",
  },
  lang = "en",
  onPlanSafeRoute,
  onAskAi,
}: AiSafetyAdvisorProps) {
  const t = LOCALIZATION[lang];

  return (
    <div className="apda-card p-5 sm:p-6 bg-white border border-[#E4E7EC] relative overflow-hidden">
      {/* Header Tag */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] text-[#7E22CE] flex items-center justify-center">
            <Sparkles className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-[#16202A] leading-tight">
              {t.aiAdvisorTitle}
            </h4>
            <p className="text-[11px] text-[#5F6D7E] font-medium">{t.aiAdvisorSubtitle}</p>
          </div>
        </div>

        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F6F8FA] border border-[#E4E7EC] text-[#5F6D7E]">
          {guidance.validUntil}
        </span>
      </div>

      {/* Main Advisory Narrative */}
      <div className="mt-4 space-y-2">
        <p className="text-base sm:text-lg font-bold text-[#16202A] leading-snug">
          "{guidance.text}"
        </p>
        <div className="p-3.5 rounded-2xl bg-[#F6F8FA] border border-[#E4E7EC] flex items-start gap-2.5 text-xs text-[#16202A] font-medium leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
          <span>{guidance.recommendation}</span>
        </div>
      </div>

      {/* 2 Clean Action Buttons (Plan Safe Route + Ask AI) */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          onClick={onPlanSafeRoute}
          type="button"
          className="py-3 px-4 rounded-xl bg-[#0F4C81] hover:bg-[#0A365C] text-white font-bold text-xs transition flex items-center justify-center gap-2 active:scale-95 shadow-2xs"
        >
          <Route className="w-4 h-4" />
          <span>{t.planSafeRoute}</span>
        </button>

        <button
          onClick={onAskAi}
          type="button"
          className="py-3 px-4 rounded-xl bg-[#F6F8FA] hover:bg-[#EEF1F6] border border-[#E4E7EC] text-[#16202A] font-bold text-xs transition flex items-center justify-center gap-2 active:scale-95"
        >
          <MessageSquare className="w-4 h-4 text-[#7E22CE]" />
          <span>{t.askAi}</span>
        </button>
      </div>
    </div>
  );
}
