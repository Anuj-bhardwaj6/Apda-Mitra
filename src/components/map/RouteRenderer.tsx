"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Navigation, Clock, ShieldCheck, AlertTriangle, X, Shuffle } from "lucide-react";
import { EvacuationRouteDetail, calculateEvacuationRoute } from "@/services/routing.service";
import { Button } from "@/components/ui/Button";

// TODO(API)
// OSRM Routing Engine

export interface RouteRendererProps {
  map: L.Map | null;
  origin: [number, number] | null;
  destination: [number, number] | null;
  onClearRoute: () => void;
}

export function RouteRenderer({
  map,
  origin,
  destination,
  onClearRoute,
}: RouteRendererProps) {
  const [routeData, setRouteData] = useState<{
    primary: EvacuationRouteDetail;
    alt?: EvacuationRouteDetail;
  } | null>(null);
  const [activeRouteId, setActiveRouteId] = useState<string>("primary");

  const polylineRef = useRef<L.Polyline | null>(null);
  const altPolylineRef = useRef<L.Polyline | null>(null);

  // Calculate Route
  useEffect(() => {
    if (!origin || !destination) {
      setRouteData(null);
      return;
    }

    calculateEvacuationRoute(origin, destination).then((res) => {
      setRouteData({ primary: res.primaryRoute, alt: res.alternativeRoute });
      setActiveRouteId("primary");
    });
  }, [origin, destination]);

  // Render Polylines
  useEffect(() => {
    if (!map || !routeData) {
      if (polylineRef.current && map?.hasLayer(polylineRef.current)) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }
      if (altPolylineRef.current && map?.hasLayer(altPolylineRef.current)) {
        map.removeLayer(altPolylineRef.current);
        altPolylineRef.current = null;
      }
      return;
    }

    const currentRoute =
      activeRouteId === "primary" ? routeData.primary : routeData.alt || routeData.primary;

    if (polylineRef.current && map.hasLayer(polylineRef.current)) {
      map.removeLayer(polylineRef.current);
    }
    if (altPolylineRef.current && map.hasLayer(altPolylineRef.current)) {
      map.removeLayer(altPolylineRef.current);
    }

    // Alternative Route (Dashed lighter line)
    if (routeData.alt && activeRouteId === "primary") {
      altPolylineRef.current = L.polyline(routeData.alt.polylineCoordinates, {
        color: "#9E9E9E",
        weight: 5,
        opacity: 0.6,
        dashArray: "8, 8",
      }).addTo(map);
    }

    // Active Route (Solid High-Contrast Blue)
    polylineRef.current = L.polyline(currentRoute.polylineCoordinates, {
      color: "#0F4C81",
      weight: 6,
      opacity: 0.9,
    }).addTo(map);

    // Zoom map to fit route
    map.fitBounds(polylineRef.current.getBounds(), { padding: [60, 60] });

    return () => {
      if (polylineRef.current && map.hasLayer(polylineRef.current)) {
        map.removeLayer(polylineRef.current);
      }
      if (altPolylineRef.current && map.hasLayer(altPolylineRef.current)) {
        map.removeLayer(altPolylineRef.current);
      }
    };
  }, [map, routeData, activeRouteId]);

  if (!routeData) return null;

  const currentRoute =
    activeRouteId === "primary" ? routeData.primary : routeData.alt || routeData.primary;

  return (
    <div className="absolute top-20 left-4 z-40 w-full max-w-sm bg-white/95 dark:bg-[#121A24]/95 backdrop-blur-md rounded-2xl shadow-modal p-4 border border-white/40 dark:border-white/10 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </span>
          <div>
            <div className="text-xs font-bold text-[#2E7D32] uppercase tracking-wider">
              Safe Evacuation Corridor
            </div>
            <div className="text-sm font-bold text-[#16202A] dark:text-white">
              {currentRoute.name}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClearRoute}
          className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ETA & Distance Hero Strip */}
      <div className="flex items-baseline justify-between py-2 border-y border-gray-100 dark:border-gray-800 my-2">
        <div>
          <span className="text-2xl font-black text-[#0F4C81] dark:text-[#4C8BF5]">
            {currentRoute.durationMinutes} min
          </span>
          <span className="text-xs text-gray-500 ml-1.5">ETA</span>
        </div>
        <div className="text-right">
          <span className="text-base font-bold text-gray-800 dark:text-gray-200">
            {currentRoute.distanceKm} km
          </span>
          <span className="text-[11px] text-gray-400 block">High Ground Path</span>
        </div>
      </div>

      {/* Hazard Avoidance Notices */}
      <div className="space-y-1.5 my-3">
        {currentRoute.roadHazardsAvoided.map((hazard, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
            <span>{hazard}</span>
          </div>
        ))}
      </div>

      {/* Alternative Route Switcher */}
      {routeData.alt && (
        <button
          type="button"
          onClick={() => setActiveRouteId(activeRouteId === "primary" ? "alt" : "primary")}
          className="w-full py-2 px-3 rounded-xl bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 text-xs font-semibold text-[#0F4C81] dark:text-[#4C8BF5] flex items-center justify-center gap-1.5 transition-colors"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Switch to {activeRouteId === "primary" ? "Alternative Route (21 min)" : "Primary Safe Route (14 min)"}</span>
        </button>
      )}
    </div>
  );
}
