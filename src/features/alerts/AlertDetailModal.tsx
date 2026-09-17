"use client";

import React from "react";
import { ShieldAlert, Compass, PhoneCall, CheckCircle, Navigation } from "lucide-react";
import { DisasterIncident } from "@/types/disaster";
import { Dialog } from "@/components/ui/Dialog";
import { RiskChip } from "@/components/ui/RiskChip";
import { GovBadge } from "@/components/common/GovBadge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/utils/formatters";

// TODO(API)
// OSRM Routing
// TODO(API)
// Nominatim Reverse Geocoding

export interface AlertDetailModalProps {
  incident: DisasterIncident | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToCorridor?: () => void;
}

export function AlertDetailModal({
  incident,
  isOpen,
  onClose,
  onNavigateToCorridor,
}: AlertDetailModalProps) {
  if (!incident) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={incident.title}
      subtitle={`Bulletin Reference: ${incident.bulletinId} • ${formatDateTime(incident.issuanceTime)}`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-card bg-gov-bg dark:bg-gray-800/60">
          <RiskChip level={incident.alertLevel} />
          <GovBadge type={incident.issuedBy.toLowerCase() as "ndma" | "imd" | "cwc"} />
          <span className="text-xs font-bold px-3 py-1 rounded-pill bg-gov-primaryLight text-gov-primary dark:bg-blue-950 dark:text-blue-200">
            Evacuation: {incident.evacuationStatus}
          </span>
        </div>

        {/* Detailed Description */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gov-primary mb-1.5">
            Official Situation Summary
          </h4>
          <p className="text-sm text-gov-text dark:text-gray-200 leading-relaxed">
            {incident.description}
          </p>
        </div>

        {/* Evacuation Route Advice */}
        {incident.safeCorridorRoute && (
          <div className="p-4 rounded-card bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
            <div className="flex items-center gap-2 text-gov-primary dark:text-blue-300 font-bold text-sm mb-1">
              <Compass className="w-4 h-4" />
              <span>Designated High-Ground Evacuation Corridor</span>
            </div>
            <p className="text-xs text-gov-text/90 dark:text-gray-200 leading-relaxed mb-3">
              {incident.safeCorridorRoute}
            </p>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Navigation className="w-4 h-4" />}
              onClick={() => {
                onClose();
                onNavigateToCorridor?.();
              }}
            >
              Set Evacuation Route on Map
            </Button>
          </div>
        )}

        {/* Mandatory Directives */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gov-primary mb-2">
            NDMA Recommended Citizen Directives
          </h4>
          <ul className="space-y-2">
            {incident.recommendedActions.map((action, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-xs text-gov-text dark:text-gray-300"
              >
                <CheckCircle className="w-4 h-4 text-gov-success shrink-0 mt-0.5" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Direct Helpline */}
        <div className="flex items-center justify-between p-3.5 rounded-btn bg-gov-dangerLight/60 dark:bg-rose-950/30 border border-gov-danger/20">
          <div>
            <span className="text-xs font-bold text-gov-danger block">
              Direct Emergency Dispatch
            </span>
            <span className="text-xs text-gov-text/80 dark:text-gray-300">
              {incident.activeHelpline}
            </span>
          </div>
          <a
            href="tel:1078"
            className="px-4 py-2 rounded-btn bg-gov-danger text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-subtle"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            Dial Helpline
          </a>
        </div>
      </div>
    </Dialog>
  );
}
