"use client";

import React from "react";
import { cn } from "@/utils/cn";

export type StatusPillType = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusPillProps {
  label: string;
  type?: StatusPillType;
  dot?: boolean;
  className?: string;
}

export function StatusPill({ label, type = "neutral", dot = true, className }: StatusPillProps) {
  const typeStyles: Record<StatusPillType, { bg: string; text: string; dotColor: string }> = {
    success: {
      bg: "bg-gov-successLight text-gov-success dark:bg-emerald-950/40 dark:text-emerald-400",
      text: "text-gov-success dark:text-emerald-400",
      dotColor: "bg-gov-success",
    },
    warning: {
      bg: "bg-gov-warningLight text-[#946200] dark:bg-amber-950/40 dark:text-amber-300",
      text: "text-[#946200] dark:text-amber-300",
      dotColor: "bg-gov-warning",
    },
    danger: {
      bg: "bg-gov-dangerLight text-gov-danger dark:bg-rose-950/40 dark:text-rose-400",
      text: "text-gov-danger dark:text-rose-400",
      dotColor: "bg-gov-danger",
    },
    info: {
      bg: "bg-gov-primaryLight text-gov-primary dark:bg-blue-950/40 dark:text-blue-300",
      text: "text-gov-primary dark:text-blue-300",
      dotColor: "bg-gov-primary",
    },
    neutral: {
      bg: "bg-gray-100 text-gov-muted dark:bg-gray-800 dark:text-gray-300",
      text: "text-gov-muted dark:text-gray-300",
      dotColor: "bg-gray-400",
    },
  };

  const current = typeStyles[type];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold select-none",
        current.bg,
        className
      )}
    >
      {dot && <span className={cn("w-2 h-2 rounded-full shrink-0", current.dotColor)} />}
      <span>{label}</span>
    </span>
  );
}
