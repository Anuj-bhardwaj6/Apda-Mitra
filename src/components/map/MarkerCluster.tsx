"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { MapPointFeature } from "@/services/map.service";

export interface MarkerClusterProps {
  map: L.Map | null;
  features: MapPointFeature[];
  onSelectFeature: (feature: MapPointFeature) => void;
  selectedFeatureId?: string;
  activeCategories?: Record<string, boolean>;
}

export function MarkerCluster({
  map,
  features,
  onSelectFeature,
  selectedFeatureId,
  activeCategories,
}: MarkerClusterProps) {
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const group = layerGroupRef.current;
    group.clearLayers();

    features.forEach((feat) => {
      // Check if category is active
      if (activeCategories && activeCategories[feat.category] === false) {
        return;
      }

      const isSelected = selectedFeatureId === feat.id;

      // Custom SVG Icons per category
      let iconColor = "#0F4C81";
      let iconInnerSvg = "";

      switch (feat.category) {
        case "shelter":
          iconColor = "#2E7D32"; // Green House
          iconInnerSvg = `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`;
          break;
        case "hospital":
          iconColor = "#D32F2F"; // Red Cross
          iconInnerSvg = `<path d="M12 5v14M5 12h14"/>`;
          break;
        case "police":
          iconColor = "#0F4C81"; // Blue Shield
          iconInnerSvg = `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`;
          break;
        case "fire":
          iconColor = "#F57C00"; // Orange Flame
          iconInnerSvg = `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`;
          break;
        case "road_closure":
          iconColor = "#C62828"; // Red Barrier
          iconInnerSvg = `<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>`;
          break;
        case "citizen_report":
          iconColor = "#7B1FA2"; // Camera
          iconInnerSvg = `<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>`;
          break;
        case "landslide":
          iconColor = "#6D4C41"; // Brown Mountain
          iconInnerSvg = `<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>`;
          break;
        case "flood":
          iconColor = "#0288D1"; // Blue Water
          iconInnerSvg = `<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>`;
          break;
        default:
          iconColor = "#455A64"; // Weather
          iconInnerSvg = `<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>`;
      }

      const size = isSelected ? 40 : 34;
      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-115">
          ${
            isSelected
              ? `<div class="absolute -inset-2 rounded-full bg-blue-500/30 animate-ping"></div>`
              : ""
          }
          <div style="width: ${size}px; height: ${size}px; background-color: ${iconColor};" class="rounded-full text-white flex items-center justify-center shadow-elevation border-2 border-white">
            <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              ${iconInnerSvg}
            </svg>
          </div>
        </div>
      `;

      const divIcon = L.divIcon({
        html: markerHtml,
        className: "apda-custom-feature-marker",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker(feat.coordinates, { icon: divIcon }).addTo(group);
      marker.on("click", () => {
        onSelectFeature(feat);
        map.flyTo(feat.coordinates, Math.max(map.getZoom(), 12), { duration: 0.8 });
      });
    });

    return () => {
      if (layerGroupRef.current && map.hasLayer(layerGroupRef.current)) {
        layerGroupRef.current.clearLayers();
      }
    };
  }, [map, features, onSelectFeature, selectedFeatureId, activeCategories]);

  return null;
}
