"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";

// TODO(API)
// Browser Geolocation API & Geofencing Watch
// Endpoint: navigator.geolocation.watchPosition()

export interface LocationMarkerProps {
  map: L.Map | null;
  coords: [number, number] | null; // [lat, lng]
  accuracyMeters?: number | null;
  headingDegrees?: number | null;
  isActive?: boolean;
}

export function LocationMarker({
  map,
  coords,
  accuracyMeters = 35,
  headingDegrees = null,
  isActive = true,
}: LocationMarkerProps) {
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!map || !coords || !isActive) {
      if (markerRef.current && map?.hasLayer(markerRef.current)) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      if (circleRef.current && map?.hasLayer(circleRef.current)) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }
      return;
    }

    const headingHtml =
      headingDegrees !== null
        ? `<div class="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-blue-600" style="transform: rotate(${headingDegrees}deg);"></div>`
        : "";

    const customIconHtml = `
      <div class="relative flex items-center justify-center w-8 h-8">
        <!-- Soft animated radar wave -->
        <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
        <!-- Outer white contrast ring -->
        <div class="relative w-5 h-5 rounded-full bg-white shadow-elevation flex items-center justify-center">
          <!-- Inner core blue dot -->
          <div class="w-3.5 h-3.5 rounded-full bg-[#1A73E8]"></div>
        </div>
        ${headingHtml}
      </div>
    `;

    const icon = L.divIcon({
      html: customIconHtml,
      className: "apda-live-user-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Accuracy Circle
    if (!circleRef.current) {
      circleRef.current = L.circle(coords, {
        radius: Math.max(accuracyMeters || 30, 20),
        color: "#1A73E8",
        fillColor: "#1A73E8",
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: "4, 4",
      }).addTo(map);
    } else {
      circleRef.current.setLatLng(coords);
      circleRef.current.setRadius(Math.max(accuracyMeters || 30, 20));
    }

    // Location Marker
    if (!markerRef.current) {
      markerRef.current = L.marker(coords, { icon, zIndexOffset: 1000 }).addTo(map);
    } else {
      markerRef.current.setLatLng(coords);
      markerRef.current.setIcon(icon);
    }

    return () => {
      if (markerRef.current && map.hasLayer(markerRef.current)) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      if (circleRef.current && map.hasLayer(circleRef.current)) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }
    };
  }, [map, coords, accuracyMeters, headingDegrees, isActive]);

  return null;
}
