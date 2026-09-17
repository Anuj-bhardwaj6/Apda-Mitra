"use client";

import React from "react";
import { CheckCircle, Clock, MapPin, ThumbsUp, AlertCircle, ShieldCheck } from "lucide-react";
import { Language, LOCALIZATION } from "@/constants/localization";

export interface CommunityReportItem {
  id: string;
  type: "Landslide" | "Waterlogging" | "Tree Fallen" | "Road Crack";
  title: string;
  landmark: string;
  updatedAgo: string;
  verified: boolean;
  verificationNotes: string;
  upvotes: number;
  lat: number;
  lng: number;
}

interface CommunityReportsFeedProps {
  reports?: CommunityReportItem[];
  lang?: Language;
  onSelectReport?: (report: CommunityReportItem) => void;
  onOpenReportModal?: () => void;
}

export function CommunityReportsFeed({
  reports = [],
  lang = "en",
  onSelectReport,
  onOpenReportModal,
}: CommunityReportsFeedProps) {
  const t = LOCALIZATION[lang];

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-lg font-bold text-[#16202A] tracking-tight">
            {t.communityReportsTitle}
          </h3>
          <p className="text-xs text-[#5F6D7E]">
            {lang === "en" ? "Real-time field reports from citizens & volunteers" : "नागरिकों एवं स्वयंसेवकों की जमीनी रिपोर्ट"}
          </p>
        </div>

        <button
          onClick={onOpenReportModal}
          type="button"
          className="text-xs font-bold text-[#0F4C81] hover:underline"
        >
          + {t.reportHazardBtn}
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="apda-card p-5 bg-white border border-[#E4E7EC] text-center">
          <p className="text-sm font-semibold text-[#5F6D7E]">
            {lang === "en"
              ? "No community hazard reports logged in your sector."
              : "वर्तमान क्षेत्र में कोई नागरिक खतरा रिपोर्ट दर्ज नहीं है।"}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {reports.map((rep) => (
            <div
              key={rep.id}
              onClick={() => onSelectReport?.(rep)}
              className="apda-card p-4 bg-white border border-[#E4E7EC] hover:border-[#0F4C81]/30 transition cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#FEF3C7] text-[#B45309]">
                    {rep.type}
                  </span>
                  {rep.verified && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#2E7D32]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{lang === "en" ? "Verified" : "सत्यापित"}</span>
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-[#5F6D7E] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {rep.updatedAgo}
                </span>
              </div>

              <h4 className="mt-2 text-sm font-bold text-[#16202A] leading-snug">
                {rep.title}
              </h4>

              <div className="mt-2 flex items-center justify-between text-xs text-[#5F6D7E]">
                <span className="flex items-center gap-1 truncate max-w-xs">
                  <MapPin className="w-3.5 h-3.5 text-[#0F4C81] shrink-0" />
                  <span className="truncate">{rep.landmark}</span>
                </span>

                <span className="flex items-center gap-1 font-semibold text-[#16202A]">
                  <ThumbsUp className="w-3 h-3 text-[#0F4C81]" />
                  <span>{rep.upvotes}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
