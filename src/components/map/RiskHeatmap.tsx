"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { RiskHeatPoint } from "@/services/heatmap.service";

export interface RiskHeatmapProps {
  map: L.Map | null;
  points: RiskHeatPoint[];
  isVisible?: boolean;
}

export function RiskHeatmap({ map, points, isVisible = true }: RiskHeatmapProps) {
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const group = layerGroupRef.current;
    group.clearLayers();

    if (!isVisible) return;

    points.forEach((pt) => {
      // 1. Outer gradient diffusion ring
      L.circle([pt.lat, pt.lng], {
        radius: pt.radiusKm * 1000,
        color: pt.color,
        fillColor: pt.color,
        fillOpacity: 0.18,
        weight: 1,
        className: "apda-risk-heat-breathe",
      }).addTo(group);

      // 2. Core high-intensity zone (40% opacity)
      L.circle([pt.lat, pt.lng], {
        radius: (pt.radiusKm * 1000) / 2,
        color: pt.color,
        fillColor: pt.color,
        fillOpacity: 0.4,
        weight: 2,
        dashArray: "6, 6",
        className: "apda-risk-heat-breathe",
      }).addTo(group);
    });

    return () => {
      if (layerGroupRef.current && map.hasLayer(layerGroupRef.current)) {
        layerGroupRef.current.clearLayers();
      }
    };
  }, [map, points, isVisible]);

  return null;
}
