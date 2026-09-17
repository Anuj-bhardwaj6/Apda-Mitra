"use client";

import React from "react";
import {
  Map,
  ShieldAlert,
  Home,
  CloudRain,
  Send,
  Layers,
  PhoneCall,
  Info,
} from "lucide-react";
import { cn } from "@/utils/cn";

export type NavTab = "overview" | "alerts" | "shelters" | "weather" | "report" | "layers";

export interface DesktopNavRailProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSos: () => void;
  unreadAlertCount?: number;
}

export function DesktopNavRail({
  activeTab,
  onSelectTab,
  onOpenSos,
  unreadAlertCount = 4,
}: DesktopNavRailProps) {
  const navItems = [
    { id: "overview" as NavTab, label: "Live Map", icon: Map },
    {
      id: "alerts" as NavTab,
      label: "Disaster Alerts",
      icon: ShieldAlert,
      badge: unreadAlertCount,
    },
    { id: "shelters" as NavTab, label: "Relief Shelters", icon: Home },
    { id: "weather" as NavTab, label: "IMD Weather", icon: CloudRain },
    { id: "layers" as NavTab, label: "GIS Layers", icon: Layers },
    { id: "report" as NavTab, label: "Report Incident", icon: Send },
  ];

  return (
    <nav
      className="hidden md:flex flex-col items-center justify-between w-20 bg-gov-surface dark:bg-gov-darkSurface border-r border-gray-100 dark:border-gray-800 py-5 z-20 shrink-0 select-none shadow-subtle"
      aria-label="Sidebar Navigation"
    >
      {/* Top Nav Items */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={cn(
                "group relative flex flex-col items-center justify-center w-14 h-14 rounded-btn transition-all duration-200",
                isActive
                  ? "bg-gov-primary text-white shadow-elevation"
                  : "text-gov-muted hover:text-gov-text hover:bg-gov-primaryLight/50 dark:hover:bg-gray-800"
              )}
              title={item.label}
            >
              <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-medium tracking-tight mt-1 leading-none text-center">
                {item.label.split(" ")[0]}
              </span>

              {item.badge ? (
                <span
                  className={cn(
                    "absolute top-1.5 right-1.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center",
                    isActive
                      ? "bg-gov-danger text-white ring-2 ring-gov-surface"
                      : "bg-gov-danger text-white"
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Bottom SOS Quick Action */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <button
          type="button"
          onClick={onOpenSos}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-btn bg-gov-danger/10 text-gov-danger hover:bg-gov-danger hover:text-white transition-all duration-200"
          title="Direct Emergency Helplines (112, 1078)"
        >
          <PhoneCall className="w-5 h-5 animate-pulse" />
          <span className="text-[10px] font-bold mt-1">112 SOS</span>
        </button>
      </div>
    </nav>
  );
}
