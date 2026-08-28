'use client';

import React, { useState, useEffect } from 'react';
import { LocationPill } from './LocationPill';
import { SafetyScoreHero } from './SafetyScoreHero';
import { QuickActionChips } from './QuickActionChips';
import { EmergencyModeView } from './EmergencyModeView';
import { LiveSituationMap } from '@/features/map/LiveSituationMap';
import { WeatherCard } from '@/features/weather/WeatherCard';
import { SituationTimeline } from '@/features/alerts/SituationTimeline';
import { SafePlacesCarousel } from '@/features/shelters/SafePlacesCarousel';
import { AISafetyAdvisorCard } from '@/features/ai/AISafetyAdvisorCard';
import { LocationSearchSheet } from './LocationSearchSheet';
import { VoiceAssistantSheet } from '@/features/ai/VoiceAssistantSheet';
import { PredictiveJourneyModal } from '@/features/journey/PredictiveJourneyModal';
import { AIPhotoReportModal } from '@/features/report/AIPhotoReportModal';
import { ShareStatusSheet } from './ShareStatusSheet';
import { DisasterRepository } from '@/repositories/DisasterRepository';
import { WeatherRepository } from '@/repositories/WeatherRepository';
import { ShelterRepository } from '@/repositories/ShelterAndJourneyRepository';
import { DisasterAppMode } from '@/shared/types/disaster';
import { WeatherData, ShelterItem, UXState } from '@/shared/types';
import { WifiOff } from 'lucide-react';

interface HomeScreenProps {
  locationName: string;
  latitude: number;
  longitude: number;
  appMode: DisasterAppMode;
  isOffline: boolean;
  onSelectLocation: (name: string, lat: number, lon: number) => void;
  onOpenSOS: () => void;
  lang: 'en' | 'hi';
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  locationName,
  latitude,
  longitude,
  appMode,
  isOffline,
  onSelectLocation,
  onOpenSOS,
  lang,
}) => {
  // Staged loading UX pipeline
  const [loadStage, setLoadStage] = useState<number>(0);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherUXState, setWeatherUXState] = useState<UXState>('loading');

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isJourneyOpen, setIsJourneyOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isShareStatusOpen, setIsShareStatusOpen] = useState(false);

  // Data fetching based on mode & location
  const score = DisasterRepository.getSafetyScore(appMode);
  const timelineEvents = DisasterRepository.getTimelineEvents(appMode);
  const communityReports = DisasterRepository.getCommunityReports();
  const safePlaces = ShelterRepository.getSafePlaces();
  const nearestShelter = safePlaces[0];

  useEffect(() => {
    // Stage 1 (0ms): Location is immediately ready
    const t1 = setTimeout(() => setLoadStage(1), 100); // Risk banner
    const t2 = setTimeout(() => setLoadStage(2), 250); // Map
    const t3 = setTimeout(async () => {
      setLoadStage(3); // Weather & cards
      const w = await WeatherRepository.getWeather(latitude, longitude, appMode);
      setWeatherData(w);
      setWeatherUXState(isOffline ? 'offline' : 'loaded');
    }, 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [latitude, longitude, appMode, isOffline]);

  const handleQuickAction = (action: string) => {
    if (action === 'emergency') onOpenSOS();
    else if (action === 'journey') setIsJourneyOpen(true);
    else if (action === 'voice') setIsVoiceOpen(true);
    else if (action === 'report') setIsReportOpen(true);
    else if (action === 'weather') {
      const el = document.getElementById('weather-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (action === 'shelter') {
      const el = document.getElementById('shelter-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-4 py-3 space-y-4 pb-28">
      {/* 0. Offline Mode Resilient Banner */}
      {isOffline && (
        <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center space-x-2 text-xs text-amber-700 dark:text-amber-300 animate-in fade-in">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
          <span className="font-semibold">
            {lang === 'hi'
              ? '⚡ ऑफ़लाइन मोड • 18 मिनट पहले कैश्ड • राहत शिविर एवं 112 उपलब्ध हैं'
              : '⚡ Offline Mode • Cached 18m ago • Shelters & 112 active offline'}
          </span>
        </div>
      )}

      {/* 1. Where am I? Location Pill */}
      <LocationPill
        locationName={locationName}
        updatedAgo={score.updatedAgo}
        onOpenSearch={() => setIsSearchOpen(true)}
        onRefreshGPS={() => onSelectLocation(locationName, latitude, longitude)}
        lang={lang}
      />

      {/* 2. Am I safe? Safety Score Banner (Hero ~170px) */}
      {loadStage >= 1 && (
        <SafetyScoreHero
          score={score}
          onNavigateToShelter={() => {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${nearestShelter.latitude},${nearestShelter.longitude}`, '_blank');
          }}
          lang={lang}
        />
      )}

      {/* 3. Disaster High Emergency State Transformation */}
      {appMode === 'disaster' ? (
        <EmergencyModeView
          nearestShelter={nearestShelter}
          locationName={locationName}
          onOpenShareStatus={() => setIsShareStatusOpen(true)}
          lang={lang}
        />
      ) : (
        /* Standard / Warning State Flow */
        <>
          {/* Live Situation Map (~45% Screen) */}
          {loadStage >= 2 && (
            <LiveSituationMap
              latitude={latitude}
              longitude={longitude}
              locationName={locationName}
              shelters={safePlaces}
              reports={communityReports}
              onOpenSearch={() => setIsSearchOpen(true)}
              onSelectShelter={(sh) => {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${sh.latitude},${sh.longitude}`, '_blank');
              }}
              lang={lang}
            />
          )}

          {/* Quick Action Chips */}
          <QuickActionChips
            onSelectAction={handleQuickAction}
            lang={lang}
          />

          {/* Apple Weather Style Card */}
          <div id="weather-section">
            <WeatherCard
              weather={weatherData}
              state={weatherUXState}
              lang={lang}
            />
          </div>

          {/* Situation Timeline & Community Verification */}
          <SituationTimeline
            events={timelineEvents}
            reports={communityReports}
            appMode={appMode}
            lang={lang}
          />

          {/* Nearby Safe Places Carousel */}
          <div id="shelter-section">
            <SafePlacesCarousel
              places={safePlaces}
              onSelectPlace={(pl) => {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${pl.latitude},${pl.longitude}`, '_blank');
              }}
              lang={lang}
            />
          </div>

          {/* Personalized AI Safety Advisor */}
          <AISafetyAdvisorCard
            onPlanTrip={() => setIsJourneyOpen(true)}
            onOpenVoice={() => setIsVoiceOpen(true)}
            lang={lang}
          />
        </>
      )}

      {/* Modals & Bottom Sheets */}
      <LocationSearchSheet
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectLocation={onSelectLocation}
        lang={lang}
      />

      <VoiceAssistantSheet
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        lang={lang}
      />

      <PredictiveJourneyModal
        isOpen={isJourneyOpen}
        onClose={() => setIsJourneyOpen(false)}
        lang={lang}
      />

      <AIPhotoReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        locationName={locationName}
        lang={lang}
      />

      <ShareStatusSheet
        isOpen={isShareStatusOpen}
        onClose={() => setIsShareStatusOpen(false)}
        locationName={locationName}
        lang={lang}
      />
    </div>
  );
};
