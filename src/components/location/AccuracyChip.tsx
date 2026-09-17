"use client";

import React from "react";
import { Crosshair } from "lucide-react";
import { cn } from "@/utils/cn";

export function AccuracyChip({
  meters,
  className,
}: {
  meters: number | null | undefined;
  className?: string;
}) {
  if (meters === null || meters === undefined) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 select-none",
        className
      )}
      title="Estimated GPS Horizontal Accuracy"
    >
      <Crosshair className="w-3 h-3 text-[#0F4C81] dark:text-[#4C8BF5]" />
      <span>±{Math.round(meters)}m Precision</span>
    </span>
  );
}
