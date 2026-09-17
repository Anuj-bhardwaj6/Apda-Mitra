"use client";

import React from "react";
import { CloudRain, Building2, PlusCircle, PhoneCall, Route, Sparkles } from "lucide-react";
import { Language, LOCALIZATION } from "@/constants/localization";

interface QuickActionsStripProps {
  lang?: Language;
  onSelectAction: (actionId: "weather" | "shelters" | "report" | "sos" | "safe_routes" | "ai_advisor") => void;
}

export function QuickActionsStrip({
  lang = "en",
  onSelectAction,
}: QuickActionsStripProps) {
  const t = LOCALIZATION[lang];

  const actions = [
    {
      id: "weather" as const,
      label: t.quickActions.weather,
      icon: CloudRain,
      color: "bg-[#E8F1F8] text-[#0F4C81] border-[#0F4C81]/20",
    },
    {
      id: "shelters" as const,
      label: t.quickActions.shelters,
      icon: Building2,
      color: "bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/20",
    },
    {
      id: "report" as const,
      label: t.quickActions.report,
      icon: PlusCircle,
      color: "bg-[#FFF8E1] text-[#B45309] border-[#F59E0B]/30",
    },
    {
      id: "sos" as const,
      label: t.quickActions.sos,
      icon: PhoneCall,
      color: "bg-[#FFEBEE] text-[#C62828] border-[#C62828]/30",
    },
    {
      id: "safe_routes" as const,
      label: t.quickActions.safeRoutes,
      icon: Route,
      color: "bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5]/20",
    },
    {
      id: "ai_advisor" as const,
      label: t.quickActions.aiAdvisor,
      icon: Sparkles,
      color: "bg-[#F3E8FF] text-[#7E22CE] border-[#7E22CE]/20",
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 px-0.5 snap-x">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={() => onSelectAction(act.id)}
              type="button"
              className="snap-start shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl bg-white hover:bg-[#F6F8FA] border border-[#E4E7EC] hover:border-[#0F4C81]/30 transition group min-w-[84px] active:scale-95 shadow-2xs"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition group-hover:scale-105 ${act.color}`}
              >
                <Icon className="w-6 h-6 stroke-[2]" />
              </div>
              <span className="text-xs font-bold text-[#16202A] text-center whitespace-nowrap">
                {act.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
