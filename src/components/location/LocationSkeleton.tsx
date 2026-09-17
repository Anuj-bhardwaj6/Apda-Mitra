"use client";

import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export function LocationSkeleton() {
  return (
    <div className="space-y-3 p-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circular" className="w-9 h-9" />
          <div className="flex-1 space-y-1.5">
            <Skeleton variant="text" className="w-3/4 h-3.5" />
            <Skeleton variant="text" className="w-1/2 h-2.5" />
          </div>
        </div>
      ))}
    </div>
  );
}
