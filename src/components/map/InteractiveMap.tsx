"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { TileProvider } from "./TileProvider";
import { LocationMarker } from "./LocationMarker";
import { MapControls } from "./MapControls";
import { LayerSelector, ActiveLayersState } from "./LayerSelector";
import { RiskHeatmap } from "./RiskHeatmap";
import { MarkerCluster } from "./MarkerCluster";
import { MapBottomSheet } from "./MapBottomSheet";
import { RouteRenderer } from "./RouteRenderer";
import { MapLegend } from "./MapLegend";
import { MapScale } from "./MapScale";
import { MapOfflineBanner } from "./OfflineBanner";
import { LocationSearchBar } from "@/components/location/LocationSearchBar";
import { PermissionBanner } from "@/components/location/PermissionBanner";
import { LocationBottomSheet } from "@/components/location/LocationBottomSheet";
import { AccuracyChip } from "@/components/location/AccuracyChip";
import {
  MapPointFeature,
  MOCK_INFRASTRUCTURE_POINTS,
  fetchBhuvanInundationPolygons,
  fetchLandslideRiskZones,
} from "@/services/map.service";
import { computeMultiHazardRiskGrid, RiskHeatPoint } from "@/services/heatmap.service";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";

export interface InteractiveMapProps {
  onSelectFeature?: (feature: MapPointFeature | null) => void;
  className?: string;
}

export function InteractiveMap({ onSelectFeature, className }: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonGroupRef = useRef<L.LayerGroup | null>(null);

  const { location, liveGpsCoords, accuracyMeters, refreshCurrentLocation, isLiveGpsActive } =
    useCurrentLocation();

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<MapPointFeature | null>(null);
  const [routeDestination, setRouteDestination] = useState<[number, number] | null>(null);
  const [riskPoints, setRiskPoints] = useState<RiskHeatPoint[]>([]);

  const [layers, setLayers] = useState<ActiveLayersState>({
    basemap: "voyager",
    riskHeatmap: true,
    weatherRadar: true,
    roadClosures: true,
    shelters: true,
    hospitals: true,
    policeStations: true,
    fireStations: true,
    citizenReports: true,
    floodZones: true,
    landslideZones: true,
    historicalEvents: false,
  });

  // 1. Initialize Real Leaflet Map Canvas
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [location.latitude, location.longitude],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
    });

    mapRef.current = map;
    setMapInstance(map);

    polygonGroupRef.current = L.layerGroup().addTo(map);

    computeMultiHazardRiskGrid().then(setRiskPoints);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. React to Location Changes (Central Reactive Engine)
  useEffect(() => {
    if (!mapInstance) return;
    mapInstance.flyTo([location.latitude, location.longitude], Math.max(mapInstance.getZoom(), 11), {
      duration: 1.2,
    });
  }, [mapInstance, location.latitude, location.longitude]);

  // 3. Render Inundation Polygons
  useEffect(() => {
    const group = polygonGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (layers.floodZones) {
      fetchBhuvanInundationPolygons().then((polys) => {
        polys.forEach((p) => {
          L.polygon(p.coordinates, {
            color: p.strokeColor,
            fillColor: p.fillColor,
            fillOpacity: 0.22,
            weight: 2,
            dashArray: "4, 4",
          }).addTo(group);
        });
      });
    }

    if (layers.landslideZones) {
      fetchLandslideRiskZones().then((polys) => {
        polys.forEach((p) => {
          L.polygon(p.coordinates, {
            color: p.strokeColor,
            fillColor: p.fillColor,
            fillOpacity: 0.28,
            weight: 2,
          }).addTo(group);
        });
      });
    }
  }, [layers.floodZones, layers.landslideZones]);

  // Map Controls Callbacks
  const handleZoomIn = useCallback(() => mapInstance?.zoomIn(), [mapInstance]);
  const handleZoomOut = useCallback(() => mapInstance?.zoomOut(), [mapInstance]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleResetNorth = () => {
    if (mapInstance) {
      mapInstance.flyTo([location.latitude, location.longitude], mapInstance.getZoom());
    }
  };

  const handleSelectFeature = (feat: MapPointFeature) => {
    setSelectedFeature(feat);
    onSelectFeature?.(feat);
  };

  const handleNavigateToFeature = (feat: MapPointFeature) => {
    setRouteDestination(feat.coordinates);
    setSelectedFeature(null);
  };

  return (
    <div className={`relative w-full h-full min-h-[450px] overflow-hidden ${className || ""}`}>
      {/* 1. Leaflet Canvas */}
      <div ref={containerRef} className="w-full h-full z-10" />

      {/* 2. Tile Provider */}
      <TileProvider map={mapInstance} activeType={layers.basemap} />

      {/* 3. Live User GPS Pulse Marker */}
      <LocationMarker
        map={mapInstance}
        coords={liveGpsCoords || [location.latitude, location.longitude]}
        accuracyMeters={accuracyMeters}
      />

      {/* 4. Multi-Hazard Risk Heatmap (40% Breathing) */}
      <RiskHeatmap map={mapInstance} points={riskPoints} isVisible={layers.riskHeatmap} />

      {/* 5. Custom SVG Marker Cluster */}
      <MarkerCluster
        map={mapInstance}
        features={MOCK_INFRASTRUCTURE_POINTS}
        onSelectFeature={handleSelectFeature}
        selectedFeatureId={selectedFeature?.id}
        activeCategories={{
          shelter: layers.shelters,
          hospital: layers.hospitals,
          police: layers.policeStations,
          fire: layers.fireStations,
          road_closure: layers.roadClosures,
          citizen_report: layers.citizenReports,
        }}
      />

      {/* 6. Evacuation Route Polyline & ETA Card */}
      <RouteRenderer
        map={mapInstance}
        origin={liveGpsCoords || [location.latitude, location.longitude]}
        destination={routeDestination}
        onClearRoute={() => setRouteDestination(null)}
      />

      {/* 7. Floating Location Search Bar */}
      <div className="absolute top-4 left-4 z-30 pointer-events-auto">
        <LocationSearchBar onOpenLocationSheet={() => setIsLocationSheetOpen(true)} />
      </div>

      {/* 8. 56px Glassmorphism Map Controls */}
      <div className="absolute top-4 right-4 z-30">
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onLocateMe={refreshCurrentLocation}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleLayers={() => setIsLayersOpen(!isLayersOpen)}
          onResetNorth={handleResetNorth}
          isFullscreen={isFullscreen}
          isLocating={isLiveGpsActive}
          isLayersOpen={isLayersOpen}
        />
      </div>

      {/* 9. Layer Selector Popover */}
      <LayerSelector
        layers={layers}
        onChangeLayers={setLayers}
        isOpen={isLayersOpen}
        onClose={() => setIsLayersOpen(false)}
      />

      {/* 10. Scale, Legend & Accuracy Chip (Bottom Left) */}
      <div className="absolute bottom-6 left-4 z-30 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2">
          <MapScale map={mapInstance} />
          <AccuracyChip meters={accuracyMeters} />
        </div>
        <MapLegend />
      </div>

      {/* 11. Feature Detail Bottom Sheet */}
      <MapBottomSheet
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
        onNavigate={handleNavigateToFeature}
        userCoords={liveGpsCoords || [location.latitude, location.longitude]}
      />

      {/* 12. Location Management Sheet */}
      <LocationBottomSheet
        isOpen={isLocationSheetOpen}
        onClose={() => setIsLocationSheetOpen(false)}
      />

      {/* 13. Offline & Permission Banners */}
      <MapOfflineBanner />
      <PermissionBanner />
    </div>
  );
}
