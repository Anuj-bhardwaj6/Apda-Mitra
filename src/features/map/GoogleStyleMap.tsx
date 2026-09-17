"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  Layers,
  Crosshair,
  Plus,
  Minus,
  Search,
  CloudRain,
  Shield,
  X,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Building2,
  HeartPulse,
  Flame,
  AlertOctagon,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { OSM_TILE_PROVIDERS } from "@/services/apiPlaceholders";
import { Language } from "@/constants/localization";
import {
  TARGET_REGION_BBOX,
  TARGET_REGION_CENTER,
} from "@/constants/targetRegion";

export interface MapPointItem {
  id: string;
  type: "user" | "flood" | "landslide" | "road_closure" | "shelter" | "hospital" | "police" | "fire" | "citizen_report";
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  severity?: "Red" | "Orange" | "Yellow" | "Green";
  polygon?: [number, number][];
  date?: string;
  trigger?: string;
  source?: string;
  sourceEventId?: string;
  locationDescription?: string;
}

export type MapMarkerItem = MapPointItem;

interface GoogleStyleMapProps {
  userCoords?: [number, number];
  evacuationRoute?: [number, number][] | null;
  selectedMarker?: MapPointItem | null;
  onSelectMarker?: (marker: MapPointItem) => void;
  points?: MapPointItem[];
  lang?: Language;
  className?: string;
  onSearchSelect?: (coords: [number, number], name: string) => void;
  targetBounds?: [[number, number], [number, number]] | null;
  isAllStates?: boolean;
  riskOverlayAvailable?: boolean;
}

export function GoogleStyleMap({
  userCoords,
  evacuationRoute,
  selectedMarker,
  onSelectMarker,
  points = [],
  lang = "en",
  className = "w-full h-full",
  onSearchSelect,
  targetBounds,
  isAllStates = true,
  riskOverlayAvailable = false,
}: GoogleStyleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonsLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const userGpsMarkerRef = useRef<L.CircleMarker | null>(null);

  // Floating controls state
  const [activeTileType, setActiveTileType] = useState<"standard" | "satellite" | "terrain">("standard");
  const [showLayerDropdown, setShowLayerDropdown] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Floating search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Interactive Layer Toggles
  const [layerVisibility, setLayerVisibility] = useState({
    landslide: true,
    flood: true,
    road_closure: true,
    shelter: true,
    hospital: true,
    police: true,
    fire: true,
    citizen_report: true,
  });

  const toggleLayer = (layerKey: keyof typeof layerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = isAllStates
      ? TARGET_REGION_CENTER
      : userCoords || TARGET_REGION_CENTER;

    const initialZoom = isAllStates ? 6 : 8;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    const tileProvider = OSM_TILE_PROVIDERS.standard;
    const tileLayer = L.tileLayer(tileProvider.url, {
      maxZoom: tileProvider.maxZoom,
      subdomains: tileProvider.subdomains,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    markersLayerRef.current = L.layerGroup().addTo(map);
    polygonsLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Initial fit to 10-state target region or state bounds
    if (isAllStates) {
      map.fitBounds(targetBounds || TARGET_REGION_BBOX, {
        padding: [25, 25],
        maxZoom: 7,
      });
    } else if (targetBounds) {
      map.fitBounds(targetBounds, {
        padding: [30, 30],
        maxZoom: 10,
      });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync map viewport when target state or region changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (isAllStates) {
      mapInstanceRef.current.fitBounds(targetBounds || TARGET_REGION_BBOX, {
        padding: [25, 25],
        maxZoom: 7,
      });
    } else if (targetBounds) {
      mapInstanceRef.current.fitBounds(targetBounds, {
        padding: [30, 30],
        maxZoom: 10,
      });
    } else if (userCoords) {
      mapInstanceRef.current.flyTo(userCoords, 9, { duration: 1.2 });
    }
  }, [isAllStates, targetBounds, userCoords]);

  // 2. Basemap Layer Switcher
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const provider = OSM_TILE_PROVIDERS[activeTileType];
    tileLayerRef.current.setUrl(provider.url);
  }, [activeTileType]);

  // 3. User GPS Marker Update
  useEffect(() => {
    if (!mapInstanceRef.current || !userCoords) return;

    if (userGpsMarkerRef.current) {
      userGpsMarkerRef.current.setLatLng(userCoords);
    } else {
      const userMarker = L.circleMarker(userCoords, {
        radius: 8,
        fillColor: "#0F4C81",
        color: "#FFFFFF",
        weight: 3,
        opacity: 1,
        fillOpacity: 1,
        className: "gps-pulse-marker",
      }).addTo(mapInstanceRef.current);

      userMarker.bindTooltip("You're here", {
        permanent: false,
        direction: "top",
        offset: [0, -8],
      });

      userGpsMarkerRef.current = userMarker;
    }
  }, [userCoords]);

  // 4. Render Markers & Hazard Polygons according to layer toggles
  useEffect(() => {
    if (!markersLayerRef.current || !polygonsLayerRef.current || !mapInstanceRef.current) return;

    markersLayerRef.current.clearLayers();
    polygonsLayerRef.current.clearLayers();

    points.forEach((item) => {
      // Check visibility filter
      const typeKey = item.type as keyof typeof layerVisibility;
      if (layerVisibility[typeKey] === false) return;

        // Draw Polygon if present (e.g. Landslide envelope / Flood inundation)
      if (item.polygon && item.polygon.length > 0) {
        const isLandslide = item.type === "landslide";
        const isCritical = isLandslide && (item.severity === "Red" || item.severity === undefined);
        const poly = L.polygon(item.polygon, {
          color: isLandslide ? (isCritical ? "#C62828" : "#EA580C") : "#1976D2",
          fillColor: isLandslide ? (isCritical ? "#C62828" : "#EA580C") : "#1976D2",
          fillOpacity: 0.25,
          weight: 2,
          dashArray: isLandslide ? "4, 4" : undefined,
          className: isLandslide ? "hazard-pulse-red" : undefined,
        });

        poly.bindPopup(`
          <div style="padding: 12px; font-family: Inter, sans-serif;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span style="font-weight: 800; color: ${isLandslide ? "#C62828" : "#1976D2"}; font-size: 13px;">
                ${item.title}
              </span>
              <span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 9999px; background: #FFEBEE; color: #C62828;">
                ${isCritical ? "80-100% CRITICAL" : "60-80% HIGH"}
              </span>
            </div>
            <div style="font-size: 11px; color: #5F6D7E; margin-top: 4px;">
              ${item.subtitle}
            </div>
          </div>
        `);

        polygonsLayerRef.current?.addLayer(poly);
      }

      // Step 9: 5 km Geo-fenced Alert Perimeter for CRITICAL Landslide Zones
      if (item.type === "landslide" && (item.severity === "Red" || item.severity === undefined)) {
        const geofenceCircle = L.circle([item.lat, item.lng], {
          radius: 5000, // 5 km radius
          color: "#C62828",
          weight: 1.5,
          dashArray: "6, 6",
          fillColor: "#C62828",
          fillOpacity: 0.07,
        });

        geofenceCircle.bindPopup(`
          <div style="padding: 14px; font-family: Inter, sans-serif; min-width: 250px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #C62828; background: #FFEBEE; padding: 2px 8px; border-radius: 9999px;">
                🚨 5 KM GEOFENCE ALERT ZONE
              </span>
              <span style="font-size: 11px; font-weight: 800; color: #C62828;">CRITICAL RISK ZONE</span>
            </div>
            <div style="font-weight: 800; color: #16202A; font-size: 13px; margin-top: 6px;">
              ${item.title}
            </div>
            <div style="font-size: 11px; color: #5F6D7E; margin-top: 4px; line-height: 1.4;">
              Automated 5 km civil protection safety geofence. Opted-in devices receive instant push alerts with evacuation vectors.
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #E4E7EC; font-size: 11px; font-weight: 700; color: #0F4C81;">
              Recommended Safe Zone: Upper Shillong Camp (1.4 km) →
            </div>
          </div>
        `);

        polygonsLayerRef.current?.addLayer(geofenceCircle);
      }

      // Draw Icon Marker
      let markerBg = "#0F4C81";
      let markerSymbol = "📍";
      let pulseClass = "";

      switch (item.type) {
        case "landslide":
          markerBg = "#C62828";
          markerSymbol = "⚠️";
          pulseClass = "hazard-pulse-red";
          break;
        case "flood":
          markerBg = "#1976D2";
          markerSymbol = "🌊";
          break;
        case "road_closure":
          markerBg = "#C62828";
          markerSymbol = "⛔";
          break;
        case "shelter":
          markerBg = "#2E7D32";
          markerSymbol = "🏛️";
          pulseClass = "shelter-beacon-green";
          break;
        case "hospital":
          markerBg = "#C62828";
          markerSymbol = "🏥";
          break;
        case "police":
          markerBg = "#0F4C81";
          markerSymbol = "👮";
          break;
        case "fire":
          markerBg = "#F59E0B";
          markerSymbol = "🚒";
          break;
        case "citizen_report":
          markerBg = "#F59E0B";
          markerSymbol = "📢";
          break;
      }

      const customIcon = L.divIcon({
        className: "custom-div-icon",
        html: `
          <div class="${pulseClass}" style="
            width: 32px;
            height: 32px;
            background: ${markerBg};
            border: 2px solid #FFFFFF;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-size: 14px;
            cursor: pointer;
            transition: transform 0.2s;
          ">
            ${markerSymbol}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([item.lat, item.lng], { icon: customIcon });

      marker.bindPopup(`
        <div style="padding: 14px; font-family: Inter, sans-serif; min-width: 200px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${markerBg};">
              ${item.type.replace("_", " ")}
            </span>
            ${item.severity ? `<span style="font-size: 10px; font-weight: 700; color: #5F6D7E;">${item.severity}</span>` : ""}
          </div>
          <div style="font-weight: 800; color: #16202A; font-size: 14px; margin-top: 4px; line-height: 1.3;">
            ${item.title}
          </div>
          ${item.source ? `
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #E4E7EC; font-size: 11px; line-height: 1.5; color: #16202A;">
              ${item.date ? `<div><strong>Date:</strong> <span style="color: #5F6D7E;">${item.date}</span></div>` : ""}
              ${item.locationDescription ? `<div><strong>Location:</strong> <span style="color: #5F6D7E;">${item.locationDescription}</span></div>` : ""}
              ${item.trigger ? `<div><strong>Trigger:</strong> <span style="color: #5F6D7E;">${item.trigger}</span></div>` : ""}
              <div><strong>Source:</strong> <span style="color: #0F4C81; font-weight: 700;">${item.source}</span></div>
              ${item.sourceEventId ? `<div><strong>Event ID:</strong> <span style="color: #5F6D7E;">${item.sourceEventId}</span></div>` : ""}
            </div>
          ` : `
            <div style="font-size: 12px; color: #5F6D7E; margin-top: 4px; line-height: 1.4;">
              ${item.subtitle}
            </div>
          `}
        </div>
      `);

      marker.on("click", () => {
        onSelectMarker?.(item);
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [points, layerVisibility, onSelectMarker]);

  // 5. Evacuation Route Polyline
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (evacuationRoute && evacuationRoute.length > 0) {
      const poly = L.polyline(evacuationRoute, {
        color: "#0F4C81",
        weight: 5,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
        dashArray: "8, 6",
      }).addTo(mapInstanceRef.current);

      mapInstanceRef.current.fitBounds(poly.getBounds(), {
        padding: [60, 60],
        maxZoom: 15,
      });

      routePolylineRef.current = poly;
    }
  }, [evacuationRoute]);

  // 5b. Fly to and focus selectedMarker when "Inspect on GIS" or incident selection is triggered
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedMarker) return;

    const lat = selectedMarker.lat;
    const lng = selectedMarker.lng;

    // Smoothly fly map to inspected incident with high-detail zoom
    mapInstanceRef.current.flyTo([lat, lng], 15, {
      duration: 1.2,
    });

    const isHazard = selectedMarker.severity === "Red" || selectedMarker.type === "landslide";
    const badgeColor = isHazard ? "#C62828" : "#0F4C81";
    const badgeBg = isHazard ? "#FFEBEE" : "#E8F1F8";

    // Draw temporary pulse beacon at inspected location if not already drawn
    const inspectBeacon = L.circleMarker([lat, lng], {
      radius: 18,
      color: badgeColor,
      weight: 3,
      fillColor: badgeColor,
      fillOpacity: 0.25,
      className: isHazard ? "hazard-pulse-red" : undefined,
    }).addTo(mapInstanceRef.current);

    // Auto-remove the temporary beacon after 8 seconds
    const timer = setTimeout(() => {
      if (mapInstanceRef.current && inspectBeacon) {
        inspectBeacon.remove();
      }
    }, 8000);

    const popup = L.popup({ offset: [0, -14], closeButton: true, autoClose: false })
      .setLatLng([lat, lng])
      .setContent(`
        <div style="padding: 12px; font-family: Inter, sans-serif; min-width: 230px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${badgeColor}; background: ${badgeBg}; padding: 2px 8px; border-radius: 9999px;">
              GIS SITREP INSPECT
            </span>
            <span style="font-size: 10px; font-weight: 800; color: ${badgeColor};">
              ${selectedMarker.severity || "ACTIVE"}
            </span>
          </div>
          <div style="font-weight: 800; color: #16202A; font-size: 14px; margin-top: 6px; line-height: 1.3;">
            ${selectedMarker.title}
          </div>
          <div style="font-size: 11px; color: #5F6D7E; margin-top: 4px; line-height: 1.4;">
            ${selectedMarker.subtitle}
          </div>
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #E4E7EC; font-size: 10px; font-weight: 700; color: #0F4C81; display: flex; justify-content: space-between;">
            <span>Coordinates:</span>
            <span>${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E</span>
          </div>
        </div>
      `)
      .openOn(mapInstanceRef.current);

    return () => {
      clearTimeout(timer);
    };
  }, [selectedMarker]);

  // 6. Handle Search Nominatim Query
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(searchQuery)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const first = data[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);
          mapInstanceRef.current?.flyTo([lat, lng], 14, { duration: 1.5 });
          onSearchSelect?.([lat, lng], first.display_name);
        }
      }
    } catch (err) {
      console.warn("Search geocoding failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCenterOnUser = () => {
    if (mapInstanceRef.current && userCoords) {
      mapInstanceRef.current.flyTo(userCoords, 14, { duration: 1 });
    }
  };

  return (
    <div className={`relative ${className} overflow-hidden`}>
      {/* 1. Leaflet Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 10-State Target Region Tactical Banner */}
      {isAllStates && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md border border-[#E4E7EC] px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-2 text-xs animate-fadeIn pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-[#0F4C81] animate-pulse" />
          <span className="font-extrabold text-[#0F4C81]">APDA MITRA TARGET REGION</span>
          <span className="text-[#5F6D7E] text-[11px] hidden md:inline">• 10 States Monitored</span>
          {!riskOverlayAvailable && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F6F8FA] text-[#5F6D7E] border border-[#E4E7EC] font-semibold">
              Risk model data unavailable
            </span>
          )}
        </div>
      )}

      {/* 2. Google Maps Style Floating Search Bar */}
      <div className="absolute top-4 left-4 right-4 sm:right-auto sm:w-96 z-20">
        <form
          onSubmit={handleSearch}
          className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-[#E4E7EC] flex items-center px-3.5 py-2.5 gap-2"
        >
          <Search className="w-4 h-4 text-[#0F4C81] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === "en" ? "Search a village, district, road or place" : "गाँव, जिला, सड़क या स्थान खोजें"}
            className="w-full text-xs font-medium text-[#16202A] placeholder:text-[#5F6D7E] bg-transparent focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[#5F6D7E] hover:text-[#16202A] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isSearching && (
            <span className="w-3.5 h-3.5 border-2 border-[#0F4C81] border-t-transparent rounded-full animate-spin shrink-0" />
          )}
        </form>
      </div>

      {/* 3. Floating Quick Map Controls (Top Right / Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Layer switcher button */}
        <div className="relative">
          <button
            onClick={() => setShowLayerDropdown(!showLayerDropdown)}
            type="button"
            className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E4E7EC] shadow-md flex items-center justify-center text-[#16202A] hover:bg-[#F6F8FA] transition"
            title="Map Layers"
          >
            <Layers className="w-5 h-5 text-[#0F4C81]" />
          </button>

          {showLayerDropdown && (
            <div className="absolute right-0 top-12 w-44 bg-white rounded-2xl shadow-xl border border-[#E4E7EC] p-2 space-y-1 z-30 animate-fadeIn">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6D7E] px-2 block">
                Basemap
              </span>
              {[
                { key: "standard" as const, label: "Street (Default)" },
                { key: "satellite" as const, label: "Satellite" },
                { key: "terrain" as const, label: "Terrain Elevation" },
              ].map((b) => (
                <button
                  key={b.key}
                  onClick={() => {
                    setActiveTileType(b.key);
                    setShowLayerDropdown(false);
                  }}
                  type="button"
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    activeTileType === b.key
                      ? "bg-[#0F4C81] text-white"
                      : "text-[#16202A] hover:bg-[#F6F8FA]"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Re-center GPS button */}
        <button
          onClick={handleCenterOnUser}
          type="button"
          className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E4E7EC] shadow-md flex items-center justify-center text-[#16202A] hover:bg-[#F6F8FA] transition"
          title="Center on My GPS"
        >
          <Crosshair className="w-5 h-5 text-[#0F4C81]" />
        </button>

        {/* Zoom In & Out */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#E4E7EC] shadow-md overflow-hidden flex flex-col">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            type="button"
            className="w-10 h-9 flex items-center justify-center hover:bg-[#F6F8FA] text-[#16202A] transition"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="h-px bg-[#E4E7EC]" />
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            type="button"
            className="w-10 h-9 flex items-center justify-center hover:bg-[#F6F8FA] text-[#16202A] transition"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Collapsible Interactive Legend (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#E4E7EC] shadow-lg overflow-hidden transition-all max-w-[280px]">
          {/* Legend Title Bar (Click to toggle) */}
          <button
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            type="button"
            className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-bold text-[#16202A] hover:bg-[#F6F8FA] transition gap-2"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0F4C81]" />
              <span>{lang === "en" ? "Interactive Legend" : "मानचित्र संकेत"}</span>
            </span>
            {isLegendOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#5F6D7E]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-[#5F6D7E]" />
            )}
          </button>

          {/* Collapsible Layer Toggles */}
          {isLegendOpen && (
            <div className="p-3 border-t border-[#E4E7EC] space-y-1.5 text-xs max-h-56 overflow-y-auto">
              <span className="text-[10px] font-bold text-[#5F6D7E] uppercase block mb-1">
                {lang === "en" ? "Toggle Layers" : "परत चालू/बंद करें"}
              </span>

              {[
                { key: "landslide" as const, label: "Landslide Risk", dot: "bg-[#C62828]" },
                { key: "flood" as const, label: "Flood Zone", dot: "bg-[#1976D2]" },
                { key: "road_closure" as const, label: "Road Blockage", dot: "bg-[#C62828]" },
                { key: "shelter" as const, label: "Verified Shelter", dot: "bg-[#2E7D32]" },
                { key: "hospital" as const, label: "Hospital", dot: "bg-[#C62828]" },
                { key: "police" as const, label: "Police Post", dot: "bg-[#0F4C81]" },
                { key: "fire" as const, label: "Fire Station", dot: "bg-[#F59E0B]" },
                { key: "citizen_report" as const, label: "Citizen Report", dot: "bg-[#F59E0B]" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-1 rounded-lg hover:bg-[#F6F8FA] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
                    <span className="text-xs font-semibold text-[#16202A]">
                      {item.label}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={layerVisibility[item.key]}
                    onChange={() => toggleLayer(item.key)}
                    className="rounded text-[#0F4C81] focus:ring-0 cursor-pointer"
                  />
                </label>
              ))}

              {/* 4-Tier Risk Scale per Step 8 */}
              <div className="pt-2 border-t border-[#E4E7EC] space-y-1">
                <span className="text-[10px] font-bold text-[#5F6D7E] uppercase block">
                  {lang === "en" ? "Landslide Risk Tiers" : "भूस्खलन जोखिम स्तर"}
                </span>
                <div className="space-y-1 text-[11px] font-bold">
                  <div className="flex items-center justify-between px-1 py-0.5 rounded bg-[#F0FDF4] text-[#166534]">
                    <span>🟢 0–30%</span>
                    <span>LOW</span>
                  </div>
                  <div className="flex items-center justify-between px-1 py-0.5 rounded bg-[#FEFCE8] text-[#854D0E]">
                    <span>🟡 30–60%</span>
                    <span>MODERATE</span>
                  </div>
                  <div className="flex items-center justify-between px-1 py-0.5 rounded bg-[#FFF7ED] text-[#C2410C]">
                    <span>🟠 60–80%</span>
                    <span>HIGH</span>
                  </div>
                  <div className="flex items-center justify-between px-1 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B]">
                    <span>🔴 80–100%</span>
                    <span>CRITICAL (5km)</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
