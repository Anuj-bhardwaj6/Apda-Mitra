"use client";

import React from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";

export interface GovBadgeProps {
  type?: "verified" | "ndma" | "imd" | "cwc";
  size?: "sm" | "md";
  className?: string;
}

export function GovBadge({ type = "verified", size = "md", className }: GovBadgeProps) {
  const configs = {
    verified: {
      text: "Official Gov Verified",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-gov-primary dark:text-gov-accent" />,
      bg: "bg-gov-primaryLight/80 dark:bg-blue-950/50 text-gov-primary dark:text-blue-200 border border-gov-primary/20",
    },
    ndma: {
      text: "NDMA Standard Alert",
      icon: <ShieldCheck className="w-3.5 h-3.5 text-gov-primary" />,
      bg: "bg-blue-50 dark:bg-blue-950/40 text-gov-primary dark:text-blue-300 border border-blue-200/60",
    },
    imd: {
      text: "IMD Doppler Verified",
      icon: <ShieldCheck className="w-3.5 h-3.5 text-gov-success" />,
      bg: "bg-gov-successLight/70 dark:bg-emerald-950/40 text-gov-success dark:text-emerald-300 border border-gov-success/20",
    },
    cwc: {
      text: "CWC Hydrological Feed",
      icon: <ShieldCheck className="w-3.5 h-3.5 text-cyan-700" />,
      bg: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200/60",
    },
  };

  const item = configs[type];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-medium select-none shadow-sm",
        size === "sm" ? "text-xs px-2.5 py-0.5" : "text-xs px-3 py-1",
        item.bg,
        className
      )}
    >
      {item.icon}
      <span>{item.text}</span>
    </span>
  );
}
