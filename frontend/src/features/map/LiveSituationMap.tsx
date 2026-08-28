'use client';

import React, { useState } from 'react';
import { MapLibreMap } from '@/components/map/MapLibreMap';
import { CommunityReport } from '@/shared/types/disaster';
import { ShelterItem } from '@/shared/types';
import { RouteDirections, fetchApi } from '@/lib/api';

interface LiveSituationMapProps {
  latitude: number;
  longitude: number;
  locationName: string;
  shelters: ShelterItem[];
  reports: CommunityReport[];
  onOpenSearch: () => void;
  onSelectShelter: (shelter: ShelterItem) => void;
  lang: 'en' | 'hi';
}

export const LiveSituationMap: React.FC<LiveSituationMapProps> = ({
  latitude,
  longitude,
  locationName,
  shelters,
  reports,
  onOpenSearch,
  onSelectShelter,
  lang,
}) => {
  const [activeRoute, setActiveRoute] = useState<RouteDirections | null>(null);
  const [timeHorizon, setTimeHorizon] = useState<'now' | '+3h' | '+6h' | '+12h' | 'tomorrow'>('now');

  const handleNavigateTo = async (
    destLat: number,
    destLon: number,
    destTitle: string,
    mode: 'driving' | 'walking' = 'driving'
  ) => {
    try {
      const res = await fetchApi<{ success: boolean; data: RouteDirections }>(
        `/routing/directions?origin_lat=${latitude}&origin_lon=${longitude}&dest_lat=${destLat}&dest_lon=${destLon}&mode=${mode}`
      );
      if (res && res.data) {
        setActiveRoute(res.data);
      }
    } catch (err) {
      console.warn('OSRM routing request failed:', err);
    }
  };

  return (
    <div className="w-full relative rounded-3xl overflow-hidden border border-[#CBD5E1] dark:border-[#24344B] shadow-sm bg-[#E9EDF0] dark:bg-[#131D2A] h-[380px] sm:h-[430px]">
      <MapLibreMap
        latitude={latitude}
        longitude={longitude}
        userLat={latitude}
        userLon={longitude}
        locationName={locationName}
        mode="citizen"
        shelters={shelters}
        reports={reports}
        activeRoute={activeRoute}
        timeHorizon={timeHorizon}
        onNavigateTo={handleNavigateTo}
        onOpenSearch={onOpenSearch}
        lang={lang}
        isCompact={false}
        className="w-full h-full"
      />
    </div>
  );
};
