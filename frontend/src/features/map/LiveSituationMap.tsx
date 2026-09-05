'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { CommunityReport } from '@/shared/types/disaster';
import { ShelterItem } from '@/shared/types';
import { RouteDirections, fetchApi } from '@/lib/api';

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#E9EDF0] dark:bg-[#131D2A] text-gray-500 animate-pulse space-y-2">
      <div className="w-8 h-8 rounded-full border-2 border-[#0F4C81] border-t-transparent animate-spin" />
      <span className="text-xs font-bold">Loading OpenStreetMap Engine...</span>
    </div>
  ),
});

interface LiveSituationMapProps {
  latitude: number;
  longitude: number;
  locationName: string;
  shelters: ShelterItem[];
  reports: CommunityReport[];
  isGpsActive?: boolean;
  isFallback?: boolean;
  onRefreshGPS?: () => void;
  onOpenSearch: () => void;
  onSelectShelter: (shelter: ShelterItem) => void;
  accuracyMeters?: number;
  lang: 'en' | 'hi';
}

export const LiveSituationMap: React.FC<LiveSituationMapProps> = ({
  latitude,
  longitude,
  locationName,
  shelters,
  reports,
  isGpsActive = false,
  isFallback = false,
  onRefreshGPS,
  onOpenSearch,
  onSelectShelter,
  accuracyMeters,
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
      <LeafletMap
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
        isGpsActive={isGpsActive}
        isFallback={isFallback}
        accuracyMeters={accuracyMeters}
        onRefreshGPS={onRefreshGPS}
        onNavigateTo={handleNavigateTo}
        onOpenSearch={onOpenSearch}
        lang={lang}
        isCompact={false}
        className="w-full h-full"
      />
    </div>
  );
};

