"use client";

import React from "react";
import { Navigation, WifiOff } from "lucide-react";
import { cn } from "@/utils/cn";

export interface GPSIndicatorProps {
  status: "active" | "searching" | "weak" | "offline";
  className?: string;
  onClick?: () => void;
}

export function GPSIndicator({ status, className, onClick }: GPSIndicatorProps) {
  const configs = {
    active: {
      label: "GPS Live",
      bg: "bg-emerald-50 dark:bg-emerald-950/40 text-[#2E7D32] dark:text-emerald-400 border-emerald-200/50",
      dot: "bg-[#2E7D32] animate-pulse",
      icon: <Navigation className="w-3.5 h-3.5" />,
    },
    searching: {
      label: "Acquiring Fix...",
      bg: "bg-blue-50 dark:bg-blue-950/40 text-[#0F4C81] dark:text-[#4C8BF5] border-blue-200/50",
      dot: "bg-blue-500 animate-ping",
      icon: <Navigation className="w-3.5 h-3.5" />,
    },
    weak: {
      label: "Weak GPS",
      bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/50",
      dot: "bg-amber-500",
      icon: <Navigation className="w-3.5 h-3.5" />,
    },
    offline: {
      label: "Offline Mode",
      bg: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200",
      dot: "bg-gray-400",
      icon: <WifiOff className="w-3.5 h-3.5" />,
    },
  };

  const current = configs[status] || configs.active;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-subtle transition-all duration-200 select-none",
        current.bg,
        className
      )}
    >
      <span className={cn("w-2 h-2 rounded-full shrink-0", current.dot)} />
      <span>{current.label}</span>
    </button>
  );
}
