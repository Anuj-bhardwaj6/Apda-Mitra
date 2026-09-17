"use client";

import React from "react";
import { Newspaper, Clock, ExternalLink } from "lucide-react";

export interface NewsItem {
  id: string;
  source: "NDMA" | "IMD" | "GSI" | "SDMA";
  headline: string;
  time: string;
  summary: string;
  tag: string;
  badgeBg: string;
  badgeText: string;
}

const DEFAULT_NEWS: NewsItem[] = [
  {
    id: "news-1",
    source: "NDMA",
    headline: "NDRF Deploys 8 Specialized Flood Rescue Battalions Across Uttarakhand",
    time: "40 mins ago",
    summary: "Pre-positioned teams equipped with inflatable motorized boats and satellite communications in high-risk zones.",
    tag: "Deployment",
    badgeBg: "bg-[#E8F1F8]",
    badgeText: "text-[#0F4C81]",
  },
  {
    id: "news-2",
    source: "IMD",
    headline: "Doppler Radar Data Indicates Monsoon Trough Shifting Northward",
    time: "2 hours ago",
    summary: "Moderate to intense convective cloud bands moving over foothills over the next 12 hours.",
    tag: "Meteorology",
    badgeBg: "bg-[#FFF9C4]",
    badgeText: "text-[#F9A825]",
  },
  {
    id: "news-3",
    source: "GSI",
    headline: "Geological Survey Maps 14 Sensitive Slope Corridors Along Char Dham Route",
    time: "4 hours ago",
    summary: "Sensor telemetry and slope stability sensors activated to alert district emergency operations centers.",
    tag: "Geological",
    badgeBg: "bg-[#E8F5E9]",
    badgeText: "text-[#2E7D32]",
  },
];

export function NewsCardsList() {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-[#0F4C81]" />
          <h3 className="text-lg font-bold text-[#16202A] tracking-tight">
            Official Disaster Updates & News
          </h3>
        </div>
        <span className="text-xs text-[#5F6D7E] font-medium">Verified Feeds</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {DEFAULT_NEWS.map((item) => (
          <div
            key={item.id}
            className="apda-card p-5 bg-white border border-[#E4E7EC] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${item.badgeBg} ${item.badgeText}`}>
                  {item.source} • {item.tag}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[#5F6D7E]">
                  <Clock className="w-3 h-3" />
                  {item.time}
                </span>
              </div>

              <h4 className="mt-3 text-sm font-bold text-[#16202A] leading-snug line-clamp-2">
                {item.headline}
              </h4>
              <p className="mt-1.5 text-xs text-[#5F6D7E] leading-relaxed line-clamp-2">
                {item.summary}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E4E7EC] flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#0F4C81]">Official Release</span>
              <span className="text-xs font-semibold text-[#5F6D7E] flex items-center gap-1">
                Read Press Note <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
