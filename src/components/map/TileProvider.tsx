"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";

export type TileLayerType =
  | "voyager"
  | "positron"
  | "osm"
  | "dark"
  | "satellite"
  | "terrain";

export interface TileProviderProps {
  map: L.Map | null;
  activeType: TileLayerType;
}

export const TILE_CONFIGS: Record<
  TileLayerType,
  { name: string; url: string; subdomains: string[]; maxZoom: number; attribution: string }
> = {
  voyager: {
    name: "CartoDB Voyager (Default)",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    subdomains: ["a", "b", "c", "d"],
    maxZoom: 19,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
  },
  positron: {
    name: "CartoDB Positron (Calm Light)",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    subdomains: ["a", "b", "c", "d"],
    maxZoom: 19,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
  osm: {
    name: "OpenStreetMap Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  },
  dark: {
    name: "Dark Mode Night Cartography",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    subdomains: ["a", "b", "c", "d"],
    maxZoom: 19,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
  satellite: {
    name: "High-Resolution Satellite (ISRO / Esri)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    subdomains: [],
    maxZoom: 18,
    attribution: "Source: Esri, Maxar, Earthstar Geographics & ISRO Bhuvan",
  },
  terrain: {
    name: "Topographic Contour Relief",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    maxZoom: 17,
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
};

export function TileProvider({ map, activeType }: TileProviderProps) {
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!map) return;

    const config = TILE_CONFIGS[activeType] || TILE_CONFIGS.voyager;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const tileLayer = L.tileLayer(config.url, {
      subdomains: config.subdomains,
      maxZoom: config.maxZoom,
      attribution: config.attribution,
    });

    tileLayer.addTo(map);
    currentTileLayerRef.current = tileLayer;

    return () => {
      if (currentTileLayerRef.current && map.hasLayer(currentTileLayerRef.current)) {
        map.removeLayer(currentTileLayerRef.current);
      }
    };
  }, [map, activeType]);

  return null;
}
