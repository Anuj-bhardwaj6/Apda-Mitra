"use client";

import React from "react";
import { AlertTriangle, Compass, Clock, MapPin, ChevronRight } from "lucide-react";
import { DisasterIncident } from "@/types/disaster";
import { Card } from "@/components/ui/Card";
import { RiskChip } from "@/components/ui/RiskChip";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/utils/formatters";

// TODO(API)
// IMD Weather
// TODO(API)
// NASA Landslide
// TODO(API)
// Bhuvan Maps

export interface AlertListProps {
  incidents: DisasterIncident[];
  onSelectIncident: (incident: DisasterIncident) => void;
  selectedId?: string;
}

export function AlertList({ incidents, onSelectIncident, selectedId }: AlertListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gov-text dark:text-white tracking-tight">
            Active Disaster Bulletins
          </h2>
          <p className="text-xs text-gov-muted mt-0.5">
            Verified National Early Warning feeds from NDMA & IMD
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-pill bg-gov-dangerLight text-gov-danger">
          {incidents.length} Active Bulletins
        </span>
      </div>

      <div className="space-y-3">
        {incidents.map((incident) => {
          const isSelected = selectedId === incident.id;
          return (
            <Card
              key={incident.id}
              elevation={isSelected ? "medium" : "subtle"}
              interactive
              onClick={() => onSelectIncident(incident)}
              className={
                isSelected
                  ? "ring-2 ring-gov-primary dark:ring-gov-accent"
                  : ""
              }
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <RiskChip level={incident.alertLevel} size="sm" />
                <span className="text-xs text-gov-muted flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {formatRelativeTime(incident.issuanceTime)}
                </span>
              </div>

              <h3 className="text-base font-bold text-gov-text dark:text-white leading-snug mb-1.5">
                {incident.title}
              </h3>

              <p className="text-sm text-gov-muted line-clamp-2 mb-3 leading-relaxed">
                {incident.headline}
              </p>

              {/* Districts tags */}
              <div className="flex items-center gap-1.5 flex-wrap mb-4">
                <MapPin className="w-3.5 h-3.5 text-gov-muted shrink-0" />
                {incident.affectedDistricts.slice(0, 3).map((d) => (
                  <span
                    key={d}
                    className="text-xs px-2 py-0.5 rounded-pill bg-gray-100 dark:bg-gray-800 text-gov-text dark:text-gray-300 font-medium"
                  >
                    {d}
                  </span>
                ))}
                {incident.affectedDistricts.length > 3 && (
                  <span className="text-xs text-gov-muted">
                    +{incident.affectedDistricts.length - 3} more
                  </span>
                )}
              </div>

              {/* Single Primary Action */}
              <Button
                size="sm"
                variant={incident.alertLevel === "RED" ? "danger" : "secondary"}
                className="w-full"
                rightIcon={<ChevronRight className="w-4 h-4" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectIncident(incident);
                }}
              >
                Inspect Safe Evacuation Corridor
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
