"use client";

import React from "react";
import { Home, Map, Bell, PlusCircle, User, PhoneCall } from "lucide-react";

export type NavTabType = "home" | "map" | "alerts" | "report" | "profile";

interface MaterialBottomNavProps {
  activeTab: NavTabType;
  onChangeTab: (tab: NavTabType) => void;
  onOpenSos: () => void;
}

export function MaterialBottomNav({
  activeTab,
  onChangeTab,
  onOpenSos,
}: MaterialBottomNavProps) {
  const tabs = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "map" as const, label: "Map", icon: Map },
    { id: "alerts" as const, label: "Alerts", icon: Bell },
    { id: "report" as const, label: "Report", icon: PlusCircle },
    { id: "profile" as const, label: "Profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-lg border-t border-[#E4E7EC] px-3 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {/* Floating SOS Action Button on mobile right above nav */}
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              type="button"
              className="flex flex-col items-center justify-center flex-1 py-1 group transition"
            >
              {/* Material 3 Rounded Pill Active Indicator */}
              <div
                className={`w-14 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? "bg-[#0F4C81] text-white"
                    : "text-[#5F6D7E] group-hover:bg-[#F7F8FA]"
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2]" />
              </div>

              {/* Label */}
              <span
                className={`text-[11px] font-semibold mt-1 transition-colors ${
                  isActive ? "text-[#0F4C81] font-bold" : "text-[#5F6D7E]"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Floating SOS Pill on mobile (Bottom-Right or Floating) */}
      <div className="fixed bottom-20 right-4 z-50 lg:hidden">
        <button
          onClick={onOpenSos}
          type="button"
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#D32F2F] text-white font-bold shadow-lg shadow-red-500/25 active:scale-95 transition"
          aria-label="Emergency SOS"
        >
          <PhoneCall className="w-4 h-4 animate-bounce" />
          <span className="text-xs tracking-wider">SOS 112</span>
        </button>
      </div>
    </div>
  );
}
