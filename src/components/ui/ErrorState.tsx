"use client";

import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/utils/cn";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Telemetry Signal Disrupted",
  message = "Unable to connect to the National Disaster Broadcast network. Cached offline protocols remain active.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 bg-gov-dangerLight dark:bg-rose-950/20 rounded-card shadow-subtle",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-gov-danger text-white flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-gov-danger mb-1">{title}</h3>
      <p className="text-sm text-gov-text/80 dark:text-gray-300 max-w-sm mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RotateCcw className="w-4 h-4" />}
        >
          Retry Connection
        </Button>
      )}
    </div>
  );
}
