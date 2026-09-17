"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/utils/cn";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 bg-gov-surface dark:bg-gov-darkSurface rounded-card shadow-subtle",
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-gov-primaryLight dark:bg-blue-950/40 text-gov-primary flex items-center justify-center mb-4">
        {icon || <ShieldCheck className="w-7 h-7" />}
      </div>
      <h3 className="text-lg font-semibold text-gov-text dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gov-muted max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
