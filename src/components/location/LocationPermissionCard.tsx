"use client";

import React from "react";
import { Navigation, ShieldCheck, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";

export interface LocationPermissionCardProps {
  onRequestPermission: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function LocationPermissionCard({
  onRequestPermission,
  onDismiss,
  className,
}: LocationPermissionCardProps) {
  return (
    <Card
      elevation="medium"
      className={cn(
        "p-6 max-w-md bg-white dark:bg-[#121A24] border border-blue-100 dark:border-blue-900/50 select-none",
        className
      )}
    >
      <div className="flex items-center gap-3.5 mb-3">
        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950 text-[#0F4C81] dark:text-[#4C8BF5] flex items-center justify-center shrink-0 shadow-subtle">
          <Navigation className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-[#0F4C81] dark:text-[#4C8BF5] uppercase tracking-wider">
            Location Intelligence
          </span>
          <h3 className="text-lg font-bold text-[#16202A] dark:text-white leading-tight">
            Enable Precise Location
          </h3>
        </div>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
        APDA MITRA utilizes your GPS coordinates to deliver geofenced IMD storm surge warnings, river flood stages, and direct evacuation corridors to nearby designated relief camps.
      </p>

      <div className="space-y-2 mb-5">
        <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
          <ShieldCheck className="w-4 h-4 text-[#2E7D32] shrink-0" />
          <span>Encrypted on-device processing compliant with GOI privacy standards</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
          <MapPin className="w-4 h-4 text-[#0F4C81] dark:text-[#4C8BF5] shrink-0" />
          <span>Battery-conscious movement geofencing</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="primary"
          className="flex-1"
          leftIcon={<Navigation className="w-4 h-4" />}
          onClick={onRequestPermission}
        >
          Enable Location
        </Button>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Later
          </Button>
        )}
      </div>
    </Card>
  );
}
