'use client';

import React, { useState } from 'react';
import { MapLibreMap } from './MapLibreMap';
import { CitizenReport, ShelterResource, RouteDirections, HistoricalLandslide, fetchApi } from '@/lib/api';

interface InteractiveMapProps {
  latitude: number;
  longitude: number;
  locationName: string;
  onLocationSelect?: (lat: number, lon: number, name?: string) => void;
  onSearchOpen?: () => void;
  reports?: CitizenReport[];
  shelters?: ShelterResource[];
  historicalLandslides?: HistoricalLandslide[];
  activeRoute?: RouteDirections | null;
  onClearRoute?: () => void;
  lang?: 'en' | 'hi';
  mode?: 'citizen' | 'officer';
  timeHorizon?: 'now' | '+3h' | '+6h' | '+12h' | 'tomorrow';
  onTimeHorizonChange?: (horizon: 'now' | '+3h' | '+6h' | '+12h' | 'tomorrow') => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  latitude,
  longitude,
  locationName,
  onLocationSelect,
  onSearchOpen,
  reports = [],
  shelters = [],
  historicalLandslides = [],
  activeRoute = null,
  onClearRoute,
  lang = 'en',
  mode = 'citizen',
  timeHorizon = 'now',
  onTimeHorizonChange,
}) => {
  const [currentRoute, setCurrentRoute] = useState<RouteDirections | null>(activeRoute);
  const [isLiveTracking, setIsLiveTracking] = useState(false);

  // Live OSRM Route Navigation Dispatcher
  const handleNavigateTo = async (
    destLat: number,
    destLon: number,
    destTitle: string,
    routeMode: 'driving' | 'walking' = 'driving'
  ) => {
    try {
      const res = await fetchApi<{ success: boolean; data: RouteDirections }>(
        `/routing/directions?origin_lat=${latitude}&origin_lon=${longitude}&dest_lat=${destLat}&dest_lon=${destLon}&mode=${routeMode}`
      );
      if (res && res.data) {
        setCurrentRoute(res.data);
      }
    } catch (err) {
      console.warn('OSRM routing request failed:', err);
    }
  };

  return (
    <div className="w-full h-full relative">
      <MapLibreMap
        latitude={latitude}
        longitude={longitude}
        userLat={latitude}
        userLon={longitude}
        locationName={locationName}
        mode={mode}
        shelters={shelters}
        reports={reports}
        historicalLandslides={mode === 'officer' ? historicalLandslides : []}
        activeRoute={currentRoute || activeRoute}
        timeHorizon={timeHorizon}
        isLiveTracking={isLiveTracking}
        onToggleLiveTracking={() => setIsLiveTracking((prev) => !prev)}
        onNavigateTo={handleNavigateTo}
        onLocationSelect={onLocationSelect}
        onOpenSearch={onSearchOpen}
        lang={lang}
        className="w-full h-full"
      />
    </div>
  );
};
