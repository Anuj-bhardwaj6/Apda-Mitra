"use client";

import React from "react";
import { X, Navigation, Phone, CheckCircle, ShieldAlert, Compass } from "lucide-react";
import { DisasterIncident } from "@/types/disaster";
import { ShelterItem } from "@/types/shelter";
import { WeatherData } from "@/types/weather";
import { WeatherWidget } from "@/features/weather/WeatherWidget";
import { ForecastStrip } from "@/features/weather/ForecastStrip";
import { RiskChip } from "@/components/ui/RiskChip";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/utils/formatters";

export interface RightInfoPanelProps {
  selectedIncident: DisasterIncident | null;
  selectedShelter: ShelterItem | null;
  weather: WeatherData;
  onClearSelection: () => void;
  onNavigateToShelter?: (shelter: ShelterItem) => void;
}

export function RightInfoPanel({
  selectedIncident,
  selectedShelter,
  weather,
  onClearSelection,
  onNavigateToShelter,
}: RightInfoPanelProps) {
  return (
    <aside className="hidden lg:flex flex-col w-[420px] bg-gov-surface dark:bg-gov-darkSurface border-l border-gray-100 dark:border-gray-800 h-[calc(100vh-62px)] overflow-y-auto p-5 z-20 shrink-0 shadow-elevation">
      {/* Selected Incident View */}
      {selectedIncident && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <RiskChip level={selectedIncident.alertLevel} size="sm" />
            <button
              type="button"
              onClick={onClearSelection}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gov-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gov-text dark:text-white leading-tight">
              {selectedIncident.title}
            </h3>
            <span className="text-xs text-gov-muted block mt-1">
              Issued by {selectedIncident.issuedBy} • {formatDateTime(selectedIncident.issuanceTime)}
            </span>
          </div>

          <div className="p-3.5 rounded-card bg-gov-bg dark:bg-gray-800/60 text-xs text-gov-text dark:text-gray-200 leading-relaxed">
            {selectedIncident.description}
          </div>

          {selectedIncident.safeCorridorRoute && (
            <div className="p-4 rounded-card bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
              <div className="flex items-center gap-2 text-gov-primary dark:text-blue-300 font-bold text-xs mb-1">
                <Compass className="w-4 h-4" />
                <span>Safe High-Ground Corridor</span>
              </div>
              <p className="text-xs text-gov-text dark:text-gray-200">
                {selectedIncident.safeCorridorRoute}
              </p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gov-primary mb-2">
              Citizen Instructions
            </h4>
            <div className="space-y-1.5">
              {selectedIncident.recommendedActions.map((act, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gov-text dark:text-gray-300">
                  <CheckCircle className="w-3.5 h-3.5 text-gov-success shrink-0 mt-0.5" />
                  <span>{act}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <a
              href="tel:1078"
              className="w-full py-2.5 rounded-btn bg-gov-danger text-white font-bold text-xs flex items-center justify-center gap-2 shadow-subtle hover:bg-red-700"
            >
              <Phone className="w-4 h-4" />
              Emergency Response ({selectedIncident.activeHelpline})
            </a>
          </div>
        </div>
      )}

      {/* Selected Shelter View */}
      {!selectedIncident && selectedShelter && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <StatusPill label="Designated Safe Center" type="success" />
            <button
              type="button"
              onClick={onClearSelection}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gov-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gov-text dark:text-white">
              {selectedShelter.name}
            </h3>
            <p className="text-xs text-gov-muted mt-0.5">{selectedShelter.address}</p>
          </div>

          {/* Occupancy Indicator */}
          <div className="p-3.5 rounded-card bg-gov-bg dark:bg-gray-800/60">
            <div className="flex justify-between text-xs mb-1 font-semibold">
              <span className="text-gov-muted">Current Camp Population</span>
              <span className="text-gov-primary dark:text-gov-accent">
                {selectedShelter.currentOccupancy} / {selectedShelter.totalCapacity} Beds
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gov-primary rounded-full"
                style={{
                  width: `${(selectedShelter.currentOccupancy / selectedShelter.totalCapacity) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Amenities */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gov-primary mb-2">
              Camp Facilities Available
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {selectedShelter.facilities.map((f, i) => (
                <div
                  key={i}
                  className="p-2 rounded-btn bg-gray-50 dark:bg-gray-800/40 text-xs text-gov-text dark:text-gray-300 font-medium"
                >
                  • {f}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              variant="primary"
              className="w-full"
              leftIcon={<Navigation className="w-4 h-4" />}
              onClick={() => onNavigateToShelter?.(selectedShelter)}
            >
              Navigate Evacuation Corridor
            </Button>
            <a
              href={`tel:${selectedShelter.contactNumber}`}
              className="w-full py-2.5 rounded-btn border border-gov-borderMuted text-gov-text dark:text-white font-medium text-xs flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <Phone className="w-3.5 h-3.5 text-gov-primary" />
              Call In-Charge ({selectedShelter.contactPerson})
            </a>
          </div>
        </div>
      )}

      {/* Default Overview: Weather & Forecast */}
      {!selectedIncident && !selectedShelter && (
        <div className="space-y-5">
          <WeatherWidget weather={weather} />
          <ForecastStrip hourlyForecast={weather.hourlyForecast} />
        </div>
      )}
    </aside>
  );
}
