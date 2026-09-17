'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopAppBar } from '@/features/home/TopAppBar';
import { HomeScreen } from '@/features/home/HomeScreen';
import { MobileNavigation } from '@/features/home/MobileNavigation';
import { JudgeDiagnosticHUD } from '@/features/judge/JudgeDiagnosticHUD';
import { InteractiveMap } from '@/components/map/InteractiveMap';
import { EmergencyDirectory } from '@/components/emergency/EmergencyDirectory';
import { CitizenReportModal } from '@/components/mobile/CitizenReportModal';
import { OfficerCommandCenter } from '@/components/command_center/OfficerCommandCenter';
import { LocationSearchSheet } from '@/features/home/LocationSearchSheet';
import { DisasterAppMode } from '@/shared/types/disaster';
import { fetchApi, CitizenReport, ShelterResource, EOCMetrics } from '@/lib/api';
import {
  ShieldAlert,
  PhoneCall,
  X,
  Smartphone,
  Monitor,
  UserCheck,
  Radio,
  Wifi,
  WifiOff,
  Settings,
  HardDrive,
  Users,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function Page() {
  // Global Application State
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [appMode, setAppMode] = useState<DisasterAppMode>('warning');
  const [isOffline, setIsOffline] = useState(false);
  const [isOfficerMode, setIsOfficerMode] = useState(false);

  // Device Frame Viewport Switcher (Showcase 390x844 vs Fluid Fullscreen)
  const [deviceFrameMode, setDeviceFrameMode] = useState<'phone' | 'fullscreen'>('phone');

  // Dynamic Location State (Sensible fallback: Wayanad headquarters)
  const FALLBACK_LAT = 11.6854;
  const FALLBACK_LON = 76.1320;
  const FALLBACK_NAME = 'Wayanad, Kerala (Fallback)';

  // Initial state: coordinates are NOT hardcoded as active location (Requirement 2 & 11)
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string>('Detecting Live Location...');
  const [locationStatus, setLocationStatus] = useState<
    'prompt' | 'detecting' | 'active' | 'denied' | 'unavailable' | 'unsupported' | 'manual' | 'timeout'
  >('prompt');
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [gpsLocked, setGpsLocked] = useState(false);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);

  // Time Horizon Forecast State (SIH Feature)
  const [timeHorizon, setTimeHorizon] = useState<'now' | '+3h' | '+6h' | '+12h' | 'tomorrow'>('now');

  // WatchPosition Ref for real-time tracking and unmount cleanup (Requirement 4 & 14)
  const watchIdRef = useRef<number | null>(null);
  // Valid location tracking refs to protect active coordinates from being erased by transient errors (Requirements 1, 2, 6, 7, 8)
  const hasValidLocationRef = useRef<boolean>(false);
  const lastValidCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  // Location change throttling refs to eliminate rapid state thrashing on minor GPS jitter (Requirements 2, 3, 4)
  const lastStateCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const lastGeocodeCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const lastSheltersCoordsRef = useRef<{ lat: number; lon: number } | null>(null);

  // Modals & Sheets
  const [isJudgeHUDOpen, setIsJudgeHUDOpen] = useState(false);
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Live Incident & EOC Data
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);
  const [shelters, setShelters] = useState<ShelterResource[]>([]);
  const [eocMetrics, setEocMetrics] = useState<EOCMetrics | null>(null);

  // Sync dark mode class with root document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Dynamic Browser GPS Geolocation with High Accuracy, 10s Timeout, and WatchPosition (Requirements 1, 2, 3, 4, 8, 10, 11, 12, 13, 14)
  const requestCurrentLocation = useCallback(async () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationStatus('unsupported');
      setIsGpsActive(false);
      setIsFallback(true);
      setLat(FALLBACK_LAT);
      setLon(FALLBACK_LON);
      setLocationName('Location permission is required to show your position.');
      return;
    }

    // Only transition to 'detecting' label if no valid location exists yet
    if (!hasValidLocationRef.current) {
      setLocationStatus('detecting');
      setLocationName('Acquiring Live GPS...');
    }

    const handleSuccess = async (pos: GeolocationPosition) => {
      const userLat = pos.coords.latitude;
      const userLon = pos.coords.longitude;
      const userAcc = pos.coords.accuracy;

      hasValidLocationRef.current = true;
      lastValidCoordsRef.current = { lat: userLat, lon: userLon };

      // Requirements 1, 3, 5:
      // - Save latitude & longitude
      // - Clear previous location error
      // - Update accuracy
      // - Show successful "Current Location" state
      setAccuracyMeters(userAcc);
      setIsGpsActive(true); // Watcher is active
      setIsFallback(false);
      setGpsLocked(true);
      setLocationStatus('active'); // Location successfully obtained
      setPermissionState('granted');

      // Update state coordinates only on initial lock or if movement exceeds ~15m (0.00015 deg)
      const prevCoords = lastStateCoordsRef.current;
      const hasSignificantMovement =
        !prevCoords ||
        Math.abs(prevCoords.lat - userLat) > 0.00015 ||
        Math.abs(prevCoords.lon - userLon) > 0.00015;

      if (hasSignificantMovement) {
        lastStateCoordsRef.current = { lat: userLat, lon: userLon };
        setLat(userLat);
        setLon(userLon);
      }

      const coordString = `${userLat.toFixed(4)}°N, ${userLon.toFixed(4)}°E`;
      // Clear any previous error/detecting message immediately
      setLocationName((prev) => {
        if (
          !prev ||
          prev.includes('Unable') ||
          prev.includes('permission') ||
          prev.includes('required') ||
          prev.includes('Acquiring') ||
          prev.includes('Detecting') ||
          prev.includes('Fallback')
        ) {
          return coordString;
        }
        return prev;
      });

      // Reverse geocode only if first time or moved > ~450m (0.004 deg)
      const prevGeocode = lastGeocodeCoordsRef.current;
      const shouldReverseGeocode =
        !prevGeocode ||
        Math.abs(prevGeocode.lat - userLat) > 0.004 ||
        Math.abs(prevGeocode.lon - userLon) > 0.004;

      if (shouldReverseGeocode) {
        lastGeocodeCoordsRef.current = { lat: userLat, lon: userLon };
        try {
          const res = await fetchApi<{ success: boolean; data: any }>(
            `/geocoding/reverse?latitude=${userLat}&longitude=${userLon}`
          );
          if (res && res.data && res.data.formatted_name) {
            setLocationName(res.data.formatted_name);
          } else if (res && res.data && res.data.district) {
            setLocationName(`${res.data.district}, ${res.data.state || 'India'}`);
          } else {
            setLocationName(coordString);
          }
        } catch {
          // Clean coordinate representation if reverse-geocoding endpoint is unreachable
          setLocationName(coordString);
        }
      }
    };

    const handleFailure = (error: GeolocationPositionError) => {
      // Requirements 2, 6, 7, 8:
      // - A temporary geolocation error must NOT immediately erase the last valid location.
      // - If a previous valid location exists and a later GPS update fails, keep the last valid coordinates and blue location marker.
      // - Only show "Unable to get your location" when there is no valid location available at all.
      if (hasValidLocationRef.current || lastValidCoordsRef.current !== null) {
        console.warn('Geolocation transient notice (preserving last valid position):', error.message);
        return;
      }

      // ONLY when NO valid location is available at all:
      setIsGpsActive(false);
      setGpsLocked(false);
      setIsFallback(true);
      setLat(FALLBACK_LAT);
      setLon(FALLBACK_LON);

      if (error.code === error.PERMISSION_DENIED) {
        setLocationStatus('denied');
        setPermissionState('denied');
        setLocationName('Location permission is required to show your position.');
      } else if (error.code === error.TIMEOUT) {
        setLocationStatus('timeout');
        setLocationName('Unable to get your location. Please try again.');
      } else {
        setLocationStatus('unavailable');
        setLocationName('Unable to get your location. Please try again.');
      }
    };

    // Requirement 4 & 14: Use watchPosition for continuous tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    try {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          handleSuccess(pos);
        },
        (err) => {
          handleFailure(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
      watchIdRef.current = watchId;
      setIsGpsActive(true); // Requirement 3: GPS Active indicates geolocation watcher is running
    } catch (e) {
      console.warn('Could not register watchPosition:', e);
      setIsGpsActive(false);
    }

    // Immediate query via getCurrentPosition
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleFailure,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [FALLBACK_LAT, FALLBACK_LON]);

  // Permission State Management and Initial GPS Request (Requirement 2 & 3)
  useEffect(() => {
    let isMounted = true;

    async function checkPermissionAndInit() {
      if (typeof window === 'undefined') return;

      if (!('geolocation' in navigator)) {
        setLocationStatus('unsupported');
        setIsFallback(true);
        setLat(FALLBACK_LAT);
        setLon(FALLBACK_LON);
        setLocationName(FALLBACK_NAME);
        return;
      }

      if (navigator.permissions && navigator.permissions.query) {
        try {
          const perm = await navigator.permissions.query({ name: 'geolocation' });
          if (!isMounted) return;

          const currentPermState = perm.state as 'prompt' | 'granted' | 'denied';
          setPermissionState(currentPermState);

          perm.onchange = () => {
            if (!isMounted) return;
            const updatedState = perm.state as 'prompt' | 'granted' | 'denied';
            setPermissionState(updatedState);
            if (updatedState === 'granted') {
              requestCurrentLocation();
            } else if (updatedState === 'denied') {
              setIsGpsActive(false);
              setIsFallback(true);
              setLocationStatus('denied');
              setLat(FALLBACK_LAT);
              setLon(FALLBACK_LON);
              setLocationName('Location permission is required to show your position.');
            } else if (updatedState === 'prompt') {
              setLocationStatus('prompt');
              requestCurrentLocation();
            }
          };

          if (currentPermState === 'granted') {
            requestCurrentLocation();
            return;
          } else if (currentPermState === 'denied') {
            setIsGpsActive(false);
            setIsFallback(true);
            setLocationStatus('denied');
            setLat(FALLBACK_LAT);
            setLon(FALLBACK_LON);
            setLocationName('Location permission is required to show your position.');
            return;
          } else if (currentPermState === 'prompt') {
            // Permission has not been granted or denied yet.
            // Request location to trigger browser permission dialog
            requestCurrentLocation();
            return;
          }
        } catch (e) {
          console.warn('Permissions query notice:', e);
        }
      }

      // Fallback if navigator.permissions is not supported
      requestCurrentLocation();
    }

    checkPermissionAndInit();

    return () => {
      isMounted = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [requestCurrentLocation, FALLBACK_LAT, FALLBACK_LON]);

  // Fetch Live Shelters from Backend Overpass
  useEffect(() => {
    if (lat === null || lon === null) return;

    // Guard: only fetch shelters if moved > ~500m
    if (
      lastSheltersCoordsRef.current &&
      Math.abs(lastSheltersCoordsRef.current.lat - lat) < 0.005 &&
      Math.abs(lastSheltersCoordsRef.current.lon - lon) < 0.005
    ) {
      return;
    }
    lastSheltersCoordsRef.current = { lat, lon };

    async function loadShelters() {
      try {
        const res = await fetchApi<{ success: boolean; data: ShelterResource[] }>(
          `/emergency/shelters?latitude=${lat}&longitude=${lon}&radius_km=15`
        );
        if (res && res.data && res.data.length > 0) {
          setShelters(res.data);
        }
      } catch (err) {
        console.warn('Shelters query notice:', err);
      }
    }
    loadShelters();
  }, [lat, lon]);

  // Live WebSocket Connection for Real-Time Incident Broadcasts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1/ws';
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'NEW_REPORT' && payload.report) {
            setCitizenReports((prev) => [payload.report, ...prev]);
          }
        } catch {
          // Ignore non-JSON heartbeat
        }
      };
    } catch {
      // Offline fallback
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handleSelectLocation = (name: string, newLat: number, newLon: number) => {
    hasValidLocationRef.current = true;
    lastValidCoordsRef.current = { lat: newLat, lon: newLon };
    lastStateCoordsRef.current = { lat: newLat, lon: newLon };
    lastGeocodeCoordsRef.current = { lat: newLat, lon: newLon };
    setLocationName(name);
    setLat(newLat);
    setLon(newLon);
    setIsGpsActive(false);
    setIsFallback(false);
    setLocationStatus('manual');
  };

  const handleCreateReport = async (category: string, description: string, photoUrl: string) => {
    try {
      const res = await fetchApi<{ success: boolean; data: CitizenReport }>('/reports/submit', {
        method: 'POST',
        body: JSON.stringify({
          category,
          description,
          latitude: lat ?? FALLBACK_LAT,
          longitude: lon ?? FALLBACK_LON,
          location_name: locationName,
          photo_url: photoUrl,
        }),
      });
      if (res && res.data) {
        setCitizenReports((prev) => [res.data, ...prev]);
      }
    } catch {
      // Local offline report fallback
      const localReport: CitizenReport = {
        id: Date.now(),
        reporter_name: 'Citizen (You)',
        category,
        description,
        latitude: lat ?? FALLBACK_LAT,
        longitude: lon ?? FALLBACK_LON,
        location_name: locationName,
        photo_url: photoUrl,
        status: 'Pending',
        created_at: new Date().toISOString(),
      };
      setCitizenReports((prev) => [localReport, ...prev]);
    }
  };

  const handleVerifyReport = (id: number) => {
    setCitizenReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Verified' } : r))
    );
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? 'bg-[#0B111A] text-white' : 'bg-[#F1F5F9] text-[#1F2937]'
      } flex flex-col items-center justify-start py-0 sm:py-6`}
    >
      {/* Presentation Device Switcher Bar (For SIH & Hackathon Demos) */}
      <div className="hidden sm:flex items-center space-x-2 mb-3 bg-white/80 dark:bg-[#131D2A]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#CBD5E1] dark:border-[#24344B] shadow-xs text-xs font-bold">
        <span className="text-[#6B7280] dark:text-[#9CA3AF] mr-1">Preview Viewport:</span>
        <button
          onClick={() => setDeviceFrameMode('phone')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
            deviceFrameMode === 'phone'
              ? 'bg-[#0F4C81] text-white shadow-xs'
              : 'text-[#4B5563] dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile Device (390 × 844)</span>
        </button>

        <button
          onClick={() => setDeviceFrameMode('fullscreen')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
            deviceFrameMode === 'fullscreen'
              ? 'bg-[#0F4C81] text-white shadow-xs'
              : 'text-[#4B5563] dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Fluid Fullscreen</span>
        </button>
      </div>

      {/* Main App Container */}
      <div
        className={`w-full transition-all duration-300 relative ${
          deviceFrameMode === 'phone'
            ? 'sm:max-w-[400px] sm:min-h-[844px] sm:max-h-[890px] sm:rounded-[44px] sm:border-[8px] sm:border-[#1E293B] dark:sm:border-[#334155] sm:shadow-2xl sm:overflow-y-auto sm:overflow-x-hidden'
            : 'max-w-4xl w-full sm:rounded-3xl sm:border sm:border-[#CBD5E1] dark:sm:border-[#24344B] sm:shadow-xl'
        } ${isDarkMode ? 'bg-[#0B111A]' : 'bg-[#F7F8FA]'}`}
      >
        {/* Dynamic Island / Top Phone Notch (Mobile Frame) */}
        {deviceFrameMode === 'phone' && (
          <div className="hidden sm:flex items-center justify-between px-6 pt-3 pb-1 bg-white dark:bg-[#131D2A] text-[11px] font-bold text-gray-800 dark:text-gray-200 select-none">
            <span>9:41</span>
            <div className="w-20 h-4 bg-black rounded-full shadow-inner" />
            <div className="flex items-center space-x-1">
              <span>5G</span>
              <span className="w-4 h-2 rounded-xs border border-current" />
            </div>
          </div>
        )}

        {/* 1. 72px Government Crest Top App Bar */}
        <TopAppBar
          districtName={locationName}
          appMode={appMode}
          lang={lang}
          isDarkMode={isDarkMode}
          onToggleLang={() => setLang((l) => (l === 'en' ? 'hi' : 'en'))}
          onToggleDarkMode={() => setIsDarkMode((d) => !d)}
          onOpenJudgeHUD={() => setIsJudgeHUDOpen(true)}
          onOpenLocationSearch={() => setIsLocationSearchOpen(true)}
        />

        {/* 2. Main Viewport Switcher for All 5 Tabs */}
        <main className="w-full flex-1">
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <HomeScreen
              locationName={locationName}
              latitude={lat}
              longitude={lon}
              appMode={appMode}
              isOffline={isOffline}
              isGpsActive={isGpsActive}
              isFallback={isFallback}
              locationStatus={locationStatus}
              permissionState={permissionState}
              onSelectLocation={handleSelectLocation}
              onRefreshGPS={requestCurrentLocation}
              onOpenSOS={() => setIsSOSOpen(true)}
              accuracyMeters={accuracyMeters ?? undefined}
              lang={lang}
              onOpenSearch={() => setIsLocationSearchOpen(true)}
            />
          )}

          {/* TAB 2: FULL GIS MAP (Leaflet OpenStreetMap Engine) */}
          {activeTab === 'map' && (
            <div className="w-full h-[calc(100dvh-135px)] sm:h-[700px] relative pb-20 z-10 map-stacking-context isolate">
              <InteractiveMap
                latitude={lat ?? FALLBACK_LAT}
                longitude={lon ?? FALLBACK_LON}
                locationName={locationName}
                isGpsActive={isGpsActive}
                isFallback={isFallback}
                accuracyMeters={accuracyMeters ?? undefined}
                onRefreshGPS={requestCurrentLocation}
                onLocationSelect={(newLat, newLon, name) => handleSelectLocation(name || 'Selected Location', newLat, newLon)}
                onSearchOpen={() => setIsLocationSearchOpen(true)}
                shelters={shelters}
                reports={citizenReports}
                mode={isOfficerMode ? 'officer' : 'citizen'}
                timeHorizon={timeHorizon}
                onTimeHorizonChange={setTimeHorizon}
                lang={lang}
              />
            </div>
          )}

          {/* TAB 3: ALERTS & EMERGENCY DIRECTORY */}
          {activeTab === 'alerts' && (
            <div className="w-full pb-20">
              <EmergencyDirectory
                contacts={[]}
                shelters={shelters}
                onOpenSOS={() => setIsSOSOpen(true)}
                lang={lang}
              />
            </div>
          )}

          {/* TAB 4: CITIZEN HAZARD REPORTING */}
          {activeTab === 'report' && (
            <div className="p-4 sm:p-6 space-y-4 pb-28">
              <div className="p-5 bg-white dark:bg-[#131D2A] border border-[#CBD5E1] dark:border-[#24344B] rounded-3xl shadow-sm text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#EBF3FA] dark:bg-[#1B2738] text-[#0F4C81] dark:text-[#81D4FA] flex items-center justify-center mx-auto shadow-sm">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold">
                  {lang === 'hi' ? 'नागरिक घटना रिपोर्टिंग केंद्र' : 'Citizen Incident Reporting'}
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  {lang === 'hi'
                    ? 'लाइव कैमरा से फोटो लें। जेमिनी एआई दृष्टि स्वतः खतरे का विश्लेषण करेगी।'
                    : 'Capture camera snapshots of slope collapse, roadblocks, or flash floods with AI auto-classification.'}
                </p>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="apda-btn-primary w-full py-3.5 text-xs sm:text-sm font-bold rounded-2xl cursor-pointer flex items-center justify-center space-x-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'नया खतरा रिपोर्ट करें (कैमरा)' : 'Launch Live Camera Report'}</span>
                </button>
              </div>

              {/* Citizen Reports Feed */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {lang === 'hi' ? 'हाल की नागरिक रिपोर्ट' : 'Recent Citizen Submissions'}
                </h4>
                {citizenReports.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#131D2A] border border-gray-200 dark:border-gray-800 text-center text-xs text-gray-400">
                    No citizen reports logged yet in this sector.
                  </div>
                ) : (
                  citizenReports.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3 bg-white dark:bg-[#131D2A] border border-[#E2E8F0] dark:border-[#24344B] rounded-2xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{rep.category}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rep.status === 'Verified'
                              ? 'bg-[#E8F5E9] text-[#2E7D32]'
                              : 'bg-[#FEF3C7] text-[#D97706]'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">{rep.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PROFILE & COMMAND CENTER SWITCHER */}
          {activeTab === 'profile' && (
            <div className="p-4 sm:p-6 space-y-4 pb-28">
              {/* Profile Card */}
              <div className="p-4 bg-white dark:bg-[#131D2A] border border-[#CBD5E1] dark:border-[#24344B] rounded-3xl shadow-sm space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0F4C81] text-white flex items-center justify-center font-bold text-lg">
                    AM
                  </div>
                  <div>
                    <h3 className="text-sm font-bold flex items-center space-x-1.5">
                      <span>Citizen Responder #4802</span>
                      <UserCheck className="w-4 h-4 text-[#2E7D32]" />
                    </h3>
                    <p className="text-xs text-gray-500">{locationName}</p>
                  </div>
                </div>

                {/* Role Switcher: Citizen vs DEOC Officer */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block">
                      {lang === 'hi' ? 'अधिकारी नियंत्रण कक्ष मोड' : 'DEOC Officer Command Deck'}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Unlocks multi-layer GIS triage & CAP broadcasting
                    </span>
                  </div>
                  <button
                    onClick={() => setIsOfficerMode(!isOfficerMode)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isOfficerMode
                        ? 'bg-[#0F4C81] text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {isOfficerMode ? 'Officer ON' : 'Citizen Mode'}
                  </button>
                </div>
              </div>

              {/* Officer Command Deck Embed if active */}
              {isOfficerMode && (
                <div className="p-4 bg-[#EBF3FA] dark:bg-[#14202E] border border-[#D0E2F2] dark:border-[#24344B] rounded-3xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#0F4C81] dark:text-[#81D4FA] uppercase tracking-wider">
                      Live Field Incident Triage Active
                    </h4>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32] animate-ping" />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Switch to the <strong>Map</strong> tab to view complete multi-layer heatmaps, NASA historical records, and triage queue.
                  </p>
                </div>
              )}

              {/* Settings & Telemetry */}
              <div className="bg-white dark:bg-[#131D2A] border border-[#CBD5E1] dark:border-[#24344B] rounded-3xl p-3 space-y-1 text-xs">
                <button
                  onClick={() => setIsJudgeHUDOpen(true)}
                  className="w-full p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <HardDrive className="w-4 h-4 text-[#0F4C81] dark:text-[#81D4FA]" />
                    <span className="font-semibold">Diagnostic HUD & Presentation Controls</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <div className="p-3 rounded-2xl flex items-center justify-between text-gray-500">
                  <div className="flex items-center space-x-2.5">
                    <Radio className="w-4 h-4 text-[#2E7D32]" />
                    <span>Real-time WebSocket Telemetry</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#2E7D32] bg-[#E8F5E9] dark:bg-[#1B2F20] px-2 py-0.5 rounded-full">
                    Connected
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* 3. Material 3 Bottom Navigation */}
        <MobileNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenSOS={() => setIsSOSOpen(true)}
          appMode={appMode}
          lang={lang}
        />
      </div>

      {/* 4. Judge Diagnostic HUD Modal */}
      <JudgeDiagnosticHUD
        isOpen={isJudgeHUDOpen}
        onClose={() => setIsJudgeHUDOpen(false)}
        appMode={appMode}
        onSetAppMode={setAppMode}
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline((o) => !o)}
      />

      {/* 5. Location Search Autocomplete Sheet */}
      <LocationSearchSheet
        isOpen={isLocationSearchOpen}
        onClose={() => setIsLocationSearchOpen(false)}
        onSelectLocation={handleSelectLocation}
        onUseCurrentGPS={requestCurrentLocation}
        lang={lang}
      />

      {/* 6. Citizen Report Camera Modal */}
      {isReportModalOpen && (
        <CitizenReportModal
          currentLat={lat ?? FALLBACK_LAT}
          currentLon={lon ?? FALLBACK_LON}
          locationName={locationName}
          onClose={() => setIsReportModalOpen(false)}
          onSubmitReport={handleCreateReport}
          lang={lang}
        />
      )}

      {/* 7. Emergency SOS 112 Dispatch Modal */}
      {isSOSOpen && (
        <div className="app-modal-overlay fixed inset-0 z-[1000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
          <div className="bg-white dark:bg-[#131D2A] border-2 border-[#D32F2F] w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4 text-[#1F2937] dark:text-white relative animate-in zoom-in-95 text-center">
            <button
              onClick={() => setIsSOSOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-[#D32F2F] text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black text-[#D32F2F]">
              {lang === 'hi' ? '🚨 आपातकालीन 112 सहायता' : '🚨 EMERGENCY SOS 112'}
            </h3>

            <p className="text-xs text-gray-600 dark:text-gray-300">
              {lang === 'hi'
                ? 'यह सीधे निकटतम पुलिस एवं आपदा नियंत्रण कक्ष (EOC) को कॉल करेगा।'
                : 'Directly connects you to District Emergency Dispatch & NDRF with GPS telemetry.'}
            </p>

            <a
              href="tel:112"
              className="w-full py-4 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-2xl font-black text-sm flex items-center justify-center space-x-2 shadow-lg"
            >
              <PhoneCall className="w-5 h-5" />
              <span>{lang === 'hi' ? 'अभी 112 पर कॉल करें' : 'Call 112 Dispatch Now'}</span>
            </a>

            <button
              onClick={() => setIsSOSOpen(false)}
              className="w-full py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
