"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight, Clock, Building, Sparkles } from "lucide-react";
import { Language, LOCALIZATION } from "@/constants/localization";

export interface AlertItem {
  id: string;
  severity: "Red" | "Orange" | "Yellow" | "Green";
  category: "Landslide" | "Flood" | "Cyclone" | "Rain";
  title: string;
  message: string;
  authority: string;
  updatedAgo: string;
  actionAdvice: string;
  type?: "official" | "ai_prediction" | "citizen_report" | "historical";
  coordinates?: [number, number];
}

interface AlertCardsListProps {
  alerts?: AlertItem[];
  lang?: Language;
  onSelectAlert?: (alert: AlertItem) => void;
  onSeeAffectedArea?: (alert: AlertItem) => void;
}

export function AlertCardsList({
  alerts = [],
  lang = "en",
  onSelectAlert,
  onSeeAffectedArea,
}: AlertCardsListProps) {
  const t = LOCALIZATION[lang];

  if (alerts.length === 0) {
    return (
      <div className="py-6 px-4 bg-white rounded-3xl border border-[#E4E7EC] text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-extrabold text-[#16202A]">
          {lang === "en" ? "Good News — No Active Disaster Bulletins" : "अच्छी खबर — कोई सक्रिय आपदा बुलेटिन नहीं"}
        </h4>
        <p className="text-xs text-[#5F6D7E] max-w-sm mx-auto leading-relaxed">
          {lang === "en"
            ? "Official NDMA, IMD and GSI automated telemetry indicates normal status across monitored corridors."
            : "मौसम विभाग एवं भूवैज्ञानिक सर्वेक्षण की ओर से कोई सक्रिय आपातकालीन चेतावनी जारी नहीं की गई है।"}
        </p>
      </div>
    );
  }

  const getSeverityBadge = (severity: AlertItem["severity"]) => {
    switch (severity) {
      case "Red":
        return {
          pill: "bg-[#FFEBEE] text-[#C62828] border-[#C62828]/30",
          tag: lang === "en" ? "CRITICAL WARNING" : "गंभीर चेतावनी",
          dot: "bg-[#C62828]",
        };
      case "Orange":
        return {
          pill: "bg-[#FEF3C7] text-[#B45309] border-[#F59E0B]/40",
          tag: lang === "en" ? "HIGH ADVISORY" : "उच्च परामर्श",
          dot: "bg-[#F59E0B]",
        };
      case "Yellow":
        return {
          pill: "bg-[#FEF9C3] text-[#A16207] border-[#EAB308]/40",
          tag: lang === "en" ? "WATCH ACTIVE" : "निगरानी सक्रिय",
          dot: "bg-[#EAB308]",
        };
      default:
        return {
          pill: "bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/30",
          tag: lang === "en" ? "NORMAL" : "सामान्य",
          dot: "bg-[#2E7D32]",
        };
    }
  };

  const getTypeMeta = (type?: AlertItem["type"]) => {
    switch (type) {
      case "ai_prediction":
        return {
          label: "AI PREDICTION",
          badge: "bg-[#F3E8FF] text-[#7E22CE] border-[#7E22CE]/20",
        };
      case "citizen_report":
        return {
          label: "CITIZEN REPORT",
          badge: "bg-[#FEF3C7] text-[#B45309] border-[#F59E0B]/20",
        };
      case "historical":
        return {
          label: "HISTORICAL EVENT",
          badge: "bg-[#F1F5F9] text-[#64748B] border-[#64748B]/20",
        };
      default:
        return {
          label: "OFFICIAL AUTHORITY WARNING",
          badge: "bg-[#E8F1F8] text-[#0F4C81] border-[#0F4C81]/20",
        };
    }
  };

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-black text-[#16202A] tracking-tight">
          {t.activeAlerts}
        </h3>
        <span className="text-xs font-bold text-[#5F6D7E]">
          {alerts.length} {lang === "en" ? "Active" : "सक्रिय"}
        </span>
      </div>

      <div className="space-y-2.5">
        {alerts.map((alert) => {
          const sev = getSeverityBadge(alert.severity);
          const typeMeta = getTypeMeta(alert.type);

          return (
            <div
              key={alert.id}
              onClick={() => onSelectAlert?.(alert)}
              className="p-4 sm:p-5 bg-white rounded-3xl border border-[#E4E7EC] hover:border-[#0F4C81]/40 transition cursor-pointer shadow-subtle space-y-2.5"
            >
              {/* Type and Severity Badges */}
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${sev.pill} flex items-center gap-1.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                  <span>{sev.tag}</span>
                </span>

                <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border ${typeMeta.badge}`}>
                  {typeMeta.label}
                </span>
              </div>

              {/* Title & Human Summary */}
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-[#16202A] leading-snug">
                  {alert.title}
                </h4>
                <p className="mt-1 text-xs text-[#5F6D7E] leading-relaxed">
                  {alert.message}
                </p>
              </div>

              {/* Action Advice Callout */}
              {alert.actionAdvice && (
                <div className="p-3 rounded-2xl bg-[#F6F8FA] border border-[#E4E7EC] text-xs font-semibold text-[#16202A]">
                  👉 {alert.actionAdvice}
                </div>
              )}

              {/* Footer Attribution */}
              <div className="pt-2 border-t border-[#E4E7EC]/70 flex items-center justify-between text-xs text-[#5F6D7E]">
                <div className="flex items-center gap-2 text-[11px] truncate">
                  <span className="font-bold text-[#16202A] truncate">
                    {t.issuedBy}: {alert.authority}
                  </span>
                  <span>•</span>
                  <span>{alert.updatedAgo}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeeAffectedArea?.(alert);
                  }}
                  type="button"
                  className="font-bold text-[#0F4C81] hover:underline flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>{t.seeAffectedArea}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
