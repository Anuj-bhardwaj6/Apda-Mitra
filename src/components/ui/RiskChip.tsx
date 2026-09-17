"use client";

import React from "react";
import { AlertTriangle, ShieldCheck, Flame, AlertCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import { AlertLevel } from "@/types/disaster";

export interface RiskChipProps {
  level: AlertLevel;
  text?: string;
  size?: "sm" | "md";
  className?: string;
}

export function RiskChip({ level, text, size = "md", className }: RiskChipProps) {
  const configs: Record<
    AlertLevel,
    { label: string; icon: React.ReactNode; bg: string; text: string }
  > = {
    RED: {
      label: "RED ALERT • TAKE ACTION",
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
      bg: "bg-gov-danger text-white",
      text: "text-white",
    },
    ORANGE: {
      label: "ORANGE WARNING • BE PREPARED",
      icon: <AlertCircle className="w-3.5 h-3.5 shrink-0" />,
      bg: "bg-gov-warning text-gray-900 font-bold",
      text: "text-gray-900",
    },
    YELLOW: {
      label: "YELLOW WATCH • BE UPDATED",
      icon: <Flame className="w-3.5 h-3.5 shrink-0" />,
      bg: "bg-amber-100 text-amber-900 font-semibold",
      text: "text-amber-900",
    },
    GREEN: {
      label: "GREEN • NO SEVERE WARNING",
      icon: <ShieldCheck className="w-3.5 h-3.5 shrink-0" />,
      bg: "bg-gov-success text-white",
      text: "text-white",
    },
  };

  const config = configs[level] || configs.GREEN;
  const displayText = text || config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-btn tracking-wide shadow-sm",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs md:text-sm",
        config.bg,
        className
      )}
    >
      {config.icon}
      <span>{displayText}</span>
    </span>
  );
}
