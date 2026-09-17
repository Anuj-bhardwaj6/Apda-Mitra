'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { RiskAnalysisRepository } from '@/repositories/RiskAnalysisRepository';
import { DisasterRiskDashboardCard } from '@/features/risk/DisasterRiskDashboardCard';
import { DisasterAppMode } from '@/shared/types/disaster';
import { WeatherData, ShelterItem, UXState } from '@/shared/types';
import { 
  DisasterRiskAnalysisResponse, 
  HistoricalWeatherSummary, 
  EnsembleForecastSummary 
} from '@/lib/api';
import { WifiOff } from 'lucide-react';

interface HomeScreenProps {
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  appMode: DisasterAppMode;
  isOffline: boolean;
  isGpsActive?: boolean;
  isFallback?: boolean;
  locationStatus?: 'prompt' | 'detecting' | 'active' | 'denied' | 'unavailable' | 'unsupported' | 'manual' | 'timeout';
  permissionState?: 'prompt' | 'granted' | 'denied' | 'unknown';
  onSelectLocation: (name: string, lat: number, lon: number) => void;
  onRefreshGPS?: () => void;
  onOpenSOS: () => void;
  accuracyMeters?: number;
  lang: 'en' | 'hi';
  onOpenSearch?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  locationName,
  latitude,
  longitude,
  appMode,
  isOffline,
  isGpsActive = false,
  isFallback = false,
  locationStatus = 'prompt',
  permissionState = 'unknown',
  onSelectLocation,
  onRefreshGPS,
  onOpenSOS,
  accuracyMeters,
  lang,
  onOpenSearch,
}) => {
  // Staged loading UX pipeline: runs once on mount without destroying/recreating DOM elements
  const [loadStage, setLoadStage] = useState<number>(3);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherUXState, setWeatherUXState] = useState<UXState>('loading');

  // Phase 3: Risk Analysis, Historical Trends, and Ensemble Forecast state
  const [riskAnalysis, setRiskAnalysis] = useState<DisasterRiskAnalysisResponse | null>(null);
  const [historicalWeather, setHistoricalWeather] = useState<HistoricalWeatherSummary | null>(null);
  const [ensembleForecast, setEnsembleForecast] = useState<EnsembleForecastSummary | null>(null);
  const [isRiskLoading, setIsRiskLoading] = useState<boolean>(true);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isJourneyOpen, setIsJourneyOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isShareStatusOpen, setIsShareStatusOpen] = useState(false);

  // Cache ref to prevent continuous data re-fetching on minor GPS jitter (Requirements 2, 3, 4)
  const lastFetchedCoordsRef = useRef<{ lat: number; lon: number } | null>(null);

  // Data fetching based on mode & location
  const score = DisasterRepository.getSafetyScore(appMode);
  const timelineEvents = DisasterRepository.getTimelineEvents(appMode);
  const communityReports = DisasterRepository.getCommunityReports();
  const safePlaces = ShelterRepository.getSafePlaces();
  const nearestShelter = safePlaces[0];

  useEffect(() => {
    // If coordinates are not yet resolved, keep loading state
    if (latitude === null || longitude === null) {
      setWeatherData(null);
      setWeatherUXState('loading');
      setRiskAnalysis(null);
      setHistoricalWeather(null);
      setEnsembleForecast(null);
      setIsRiskLoading(true);
      return;
    }

    // Guard against re-fetching on minor (< 200m) GPS jitter
    if (
      lastFetchedCoordsRef.current &&
      Math.abs(lastFetchedCoordsRef.current.lat - latitude) < 0.002 &&
      Math.abs(lastFetchedCoordsRef.current.lon - longitude) < 0.002
    ) {
      return;
    }
    lastFetchedCoordsRef.current = { lat: latitude, lon: longitude };

    WeatherRepository.getWeather(latitude, longitude, appMode)
      .then((w) => {
        setWeatherData(w);
        setWeatherUXState(isOffline ? 'offline' : 'loaded');
      })
      .catch(() => {
        setWeatherData(null);
        setWeatherUXState('error');
      });

    // Phase 3 telemetry & risk analysis fetch
    setIsRiskLoading(true);
    RiskAnalysisRepository.getDisasterRiskAnalysis(latitude, longitude, locationName)
      .then(setRiskAnalysis)
      .catch(() => setRiskAnalysis(null));
    RiskAnalysisRepository.getHistoricalWeather(latitude, longitude, 14, locationName)
      .then(setHistoricalWeather)
      .catch(() => setHistoricalWeather(null));
    RiskAnalysisRepository.getEnsembleForecast(latitude, longitude, 'icon_seamless', locationName)
      .then(setEnsembleForecast)
      .catch(() => setEnsembleForecast(null))
      .finally(() => setIsRiskLoading(false));
  }, [latitude, longitude, appMode, isOffline, locationName]);


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
        elevationMeters={weatherData?.elevationM}
        latitude={latitude ?? undefined}
        longitude={longitude ?? undefined}
        isGpsActive={isGpsActive}
        isFallback={isFallback}
        status={locationStatus}
        permissionState={permissionState}
        onOpenSearch={() => setIsSearchOpen(true)}
        onRefreshGPS={onRefreshGPS || (() => onSelectLocation(locationName, latitude ?? 11.6854, longitude ?? 76.1320))}
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
        <>
          <EmergencyModeView
            nearestShelter={nearestShelter}
            locationName={locationName}
            onOpenShareStatus={() => setIsShareStatusOpen(true)}
            lang={lang}
          />
          {/* Phase 3: Explainable Disaster Early-Warning Risk Intelligence Card */}
          <div id="risk-analysis-section">
            <DisasterRiskDashboardCard
              riskData={riskAnalysis}
              historicalData={historicalWeather}
              ensembleData={ensembleForecast}
              isLoading={isRiskLoading}
              lang={lang}
            />
          </div>
        </>
      ) : (
        /* Standard / Warning State Flow */
        <>
          {/* Live Situation Map (~45% Screen) */}
          <LiveSituationMap
            latitude={latitude ?? 11.6854}
            longitude={longitude ?? 76.1320}
            locationName={locationName}
            shelters={safePlaces}
            reports={communityReports}
            isGpsActive={isGpsActive}
            isFallback={isFallback}
            accuracyMeters={accuracyMeters}
            onRefreshGPS={onRefreshGPS}
            onOpenSearch={onOpenSearch ? onOpenSearch : () => setIsSearchOpen(true)}
            onSelectShelter={(sh) => {
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${sh.latitude},${sh.longitude}`, '_blank');
            }}
            lang={lang}
          />

          {/* Quick Action Chips */}
          <QuickActionChips
            onSelectAction={handleQuickAction}
            lang={lang}
          />

          {/* Phase 3: Explainable Disaster Early-Warning Risk Intelligence Card */}
          <div id="risk-analysis-section">
            <DisasterRiskDashboardCard
              riskData={riskAnalysis}
              historicalData={historicalWeather}
              ensembleData={ensembleForecast}
              isLoading={isRiskLoading}
              lang={lang}
            />
          </div>

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
        onUseCurrentGPS={onRefreshGPS}
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
