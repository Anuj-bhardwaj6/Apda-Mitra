"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { DisasterIncident } from "@/types/disaster";
import { ShelterItem } from "@/types/shelter";
import { MapLayersState } from "./MapLayersControl";

export interface MapViewProps {
  incidents?: DisasterIncident[];
  shelters?: ShelterItem[];
  selectedIncident?: DisasterIncident | null;
  selectedShelter?: ShelterItem | null;
  onSelectIncident?: (incident: DisasterIncident) => void;
  onSelectShelter?: (shelter: ShelterItem) => void;
  layers?: MapLayersState;
  centerCoords?: [number, number];
  userCoords?: [number, number] | null;
  evacuationRoute?: [number, number][] | null;
}

const DEFAULT_LAYERS: MapLayersState = {
  showShelters: true,
  showHospitals: true,
  showFloods: true,
  showCycloneTrack: true,
  showNdrfUnits: true,
  basemap: "standard",
};

export function MapView({
  incidents = [],
  shelters = [],
  selectedIncident = null,
  selectedShelter = null,
  onSelectIncident = () => {},
  onSelectShelter = () => {},
  layers = DEFAULT_LAYERS,
  centerCoords = [20.82, 87.21],
  userCoords = null,
  evacuationRoute = null,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: centerCoords,
      zoom: 8,
      zoomControl: false,
      attributionControl: false,
    });

    // Clean cartography basemap
    const tileUrl =
      layers.basemap === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : layers.basemap === "terrain"
        ? "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    const tileLayer = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Zoom control at bottom right (standard GIS position)
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap URL when layers.basemap changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const tileUrl =
      layers.basemap === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : layers.basemap === "terrain"
        ? "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    tileLayerRef.current.setUrl(tileUrl);
  }, [layers.basemap]);

  // Render Overlays, Corridors & Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. User Live GPS Location Marker
    if (userCoords) {
      const userHtml = `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-7 h-7 rounded-full bg-blue-500/40 animate-ping"></span>
          <div class="w-4 h-4 rounded-full bg-[#0F4C81] border-2 border-white shadow-md"></div>
        </div>
      `;
      const userIcon = L.divIcon({
        html: userHtml,
        className: "custom-user-gps-marker",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker(userCoords, { icon: userIcon, zIndexOffset: 1000 })
        .bindTooltip("You are here", { permanent: false, direction: "top" })
        .addTo(group);
    }

    // 2. Disaster Incidents
    incidents.forEach((inc) => {
      const isRed = inc.alertLevel === "RED";
      const iconHtml = `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-8 h-8 rounded-full ${
            isRed ? "bg-red-500/30 animate-ping" : "bg-amber-500/30"
          }"></span>
          <div class="w-8 h-8 rounded-full ${
            isRed ? "bg-[#D32F2F]" : "bg-[#F9A825]"
          } text-white flex items-center justify-center shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        html: iconHtml,
        className: "custom-disaster-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(inc.coordinates, { icon: markerIcon }).addTo(group);
      marker.on("click", () => onSelectIncident(inc));

      // Cyclone Buffer Zone
      if (inc.category === "CYCLONE" && layers.showCycloneTrack && inc.radiusKm) {
        L.circle(inc.coordinates, {
          radius: inc.radiusKm * 1000,
          color: "#D32F2F",
          fillColor: "#D32F2F",
          fillOpacity: 0.12,
          weight: 2,
          dashArray: "6, 6",
        }).addTo(group);
      }
    });

    // 3. Shelters & Relief Camps
    if (layers.showShelters) {
      shelters
        .filter((s) => s.type === "CYCLONE_SHELTER" || s.type === "RELIEF_CAMP")
        .forEach((sh) => {
          const iconHtml = `
            <div class="w-7 h-7 rounded-full bg-[#0F4C81] text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer hover:scale-110 transition-transform">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
            </div>
          `;
          const icon = L.divIcon({
            html: iconHtml,
            className: "custom-shelter-marker",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const m = L.marker(sh.coordinates, { icon }).addTo(group);
          m.on("click", () => onSelectShelter(sh));
        });
    }

    // 4. Hospitals
    if (layers.showHospitals) {
      shelters
        .filter((s) => s.type === "DISTRICT_HOSPITAL")
        .forEach((hosp) => {
          const iconHtml = `
            <div class="w-7 h-7 rounded-full bg-[#2E7D32] text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer hover:scale-110 transition-transform">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
          `;
          const icon = L.divIcon({
            html: iconHtml,
            className: "custom-hospital-marker",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const m = L.marker(hosp.coordinates, { icon }).addTo(group);
          m.on("click", () => onSelectShelter(hosp));
        });
    }

    // 5. NDRF Bases
    if (layers.showNdrfUnits) {
      shelters
        .filter((s) => s.type === "NDRF_BASE")
        .forEach((ndrf) => {
          const iconHtml = `
            <div class="w-7 h-7 rounded-full bg-[#0A365C] text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer hover:scale-110 transition-transform">
              <span style="font-size: 8px; font-weight: 900;">NDRF</span>
            </div>
          `;
          const icon = L.divIcon({
            html: iconHtml,
            className: "custom-ndrf-marker",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const m = L.marker(ndrf.coordinates, { icon }).addTo(group);
          m.on("click", () => onSelectShelter(ndrf));
        });
    }

    // 6. Evacuation Route Polyline (Live OSRM)
    if (evacuationRoute && evacuationRoute.length > 1) {
      // Glow underlay
      L.polyline(evacuationRoute, {
        color: "#2563EB",
        weight: 8,
        opacity: 0.35,
        lineCap: "round",
      }).addTo(group);

      // Main corridor line
      const poly = L.polyline(evacuationRoute, {
        color: "#0F4C81",
        weight: 4,
        opacity: 0.95,
        dashArray: "8, 6",
        lineCap: "round",
      }).addTo(group);

      // Fit map bounds to show complete evacuation corridor
      map.fitBounds(poly.getBounds(), { padding: [40, 40], maxZoom: 14 });
    }
  }, [incidents, shelters, layers, userCoords, evacuationRoute, onSelectIncident, onSelectShelter]);

  // Pan to selected incident or shelter
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (selectedIncident) {
      map.flyTo(selectedIncident.coordinates, 9, { duration: 1.2 });
    } else if (selectedShelter) {
      map.flyTo(selectedShelter.coordinates, 12, { duration: 1.2 });
    }
  }, [selectedIncident, selectedShelter]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[400px] z-10" />;
}
