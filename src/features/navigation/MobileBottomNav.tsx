"use client";

import React from "react";
import { Map, ShieldAlert, Home, CloudRain, PhoneCall } from "lucide-react";
import { NavTab } from "./DesktopNavRail";
import { cn } from "@/utils/cn";

export interface MobileBottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSos: () => void;
  unreadAlertCount?: number;
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  onOpenSos,
  unreadAlertCount = 4,
}: MobileBottomNavProps) {
  const items = [
    { id: "overview" as NavTab, label: "Map", icon: Map },
    { id: "alerts" as NavTab, label: "Alerts", icon: ShieldAlert, badge: unreadAlertCount },
    { id: "shelters" as NavTab, label: "Shelters", icon: Home },
    { id: "weather" as NavTab, label: "Weather", icon: CloudRain },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 bg-gov-surface/95 dark:bg-gov-darkSurface/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-50 md:hidden px-3 py-2 pb-safe">
      <div className="flex items-center justify-around gap-1 max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 py-1.5 rounded-btn transition-colors",
                isActive ? "text-gov-primary font-bold dark:text-gov-accent" : "text-gov-muted hover:text-gov-text"
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge ? (
                  <span className="absolute -top-1.5 -right-2 bg-gov-danger text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Floating SOS in Mobile Nav */}
        <button
          type="button"
          onClick={onOpenSos}
          className="flex flex-col items-center justify-center flex-1 py-1.5 rounded-btn text-gov-danger font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30"
        >
          <div className="w-8 h-8 rounded-full bg-gov-danger text-white flex items-center justify-center shadow-subtle">
            <PhoneCall className="w-4 h-4 animate-pulse" />
          </div>
          <span className="text-[10px] mt-0.5 text-gov-danger font-bold">112</span>
        </button>
      </div>
    </div>
  );
}
