"use client";

import React from "react";
import { cn } from "@/utils/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card";
}

export function Skeleton({ className, variant = "rectangular", ...props }: SkeletonProps) {
  const variantStyles = {
    text: "h-4 w-full rounded-md",
    circular: "rounded-full aspect-square",
    rectangular: "rounded-btn",
    card: "rounded-card h-40 w-full",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200/80 dark:bg-gray-800",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
