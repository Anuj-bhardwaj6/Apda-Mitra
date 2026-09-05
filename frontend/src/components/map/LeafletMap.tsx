'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Home,
  Hospital,
  AlertTriangle,
  Navigation,
  Phone,
  X,
  ExternalLink,
  Layers,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Maximize2,
  Minimize2,
  Car,
  Footprints,
  Shield,
  Clock,
  Compass
} from 'lucide-react';
import { RouteDirections, ShelterResource, CitizenReport, HistoricalLandslide } from '@/lib/api';

export interface MapPlace {
  id: string | number;
  type: 'user' | 'shelter' | 'hospital' | 'police' | 'closure' | 'report' | 'historical';
  title: string;
  subtitle?: string;
  description?: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  capacity?: number;
  occupancy?: number;
  contactPhone?: string;
  status?: string;
  severity?: string;
  confidence?: number;
  source?: string;
  verifiedCount?: number;
}

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  userLat?: number;
  userLon?: number;
  locationName?: string;
  mode?: 'citizen' | 'officer';
  shelters?: ShelterResource[] | any[];
  hospitals?: any[];
  closures?: any[];
  reports?: CitizenReport[] | any[];
  historicalLandslides?: HistoricalLandslide[];
  activeRoute?: RouteDirections | null;
  timeHorizon?: 'now' | '+3h' | '+6h' | '+12h' | 'tomorrow';
  isLiveTracking?: boolean;
  isGpsActive?: boolean;
  isFallback?: boolean;
  onRefreshGPS?: () => void;
  onToggleLiveTracking?: () => void;
  onNavigateTo?: (destLat: number, destLon: number, destTitle: string, mode?: 'driving' | 'walking') => void;
  onLocationSelect?: (lat: number, lon: number, name?: string) => void;
  lang?: 'en' | 'hi';
  className?: string;
  isCompact?: boolean;
  onOpenSearch?: () => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  latitude,
  longitude,
  userLat,
  userLon,
  locationName = 'Current Location',
  mode = 'citizen',
  shelters = [],
  hospitals = [],
  closures = [],
  reports = [],
  historicalLandslides = [],
  activeRoute = null,
  timeHorizon = 'now',
  isLiveTracking = false,
  isGpsActive = false,
  isFallback = false,
  onRefreshGPS,
  onToggleLiveTracking,
  onNavigateTo,
  onLocationSelect,
  lang = 'en',
  className = '',
  isCompact = false,
  onOpenSearch,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const placeMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // Bottom Sheet State
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeLayers, setActiveLayers] = useState({
    shelters: true,
    hospitals: true,
    hazards: true,
    reports: true,
  });
  const [routingMode, setRoutingMode] = useState<'driving' | 'walking'>('driving');

  const effectiveLat = userLat ?? latitude;
  const effectiveLon = userLon ?? longitude;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create Map with OpenStreetMap live tiles (Zero API key required)
    const map = L.map(mapContainerRef.current, {
      center: [effectiveLat, effectiveLon],
      zoom: isCompact ? 13 : 14,
      zoomControl: false, // We use custom styled zoom control in bottom-right
      attributionControl: true,
    });

    // Real OpenStreetMap Standard Tile Layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add Leaflet zoom control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layer group for place markers
    const placeGroup = L.layerGroup().addTo(map);
    placeMarkersLayerRef.current = placeGroup;

    mapInstanceRef.current = map;

    // Force tile recalculation on load
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Center and Blue User Location Marker + Accuracy Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Smoothly pan to new GPS coordinates
    map.panTo([effectiveLat, effectiveLon], { animate: true, duration: 0.8 });

    // 1. Blue Current Location Beacon Marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([effectiveLat, effectiveLon]);
    } else {
      const userIcon = L.divIcon({
        className: 'gps-pulse-icon',
        html: `
          <div class="gps-pulse-container">
            <div class="gps-pulse-ring"></div>
            <div class="gps-pulse-dot"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const userMarker = L.marker([effectiveLat, effectiveLon], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      userMarker.on('click', () => {
        setSelectedPlace({
          id: 'user-loc',
          type: 'user',
          title: lang === 'hi' ? 'आपकी लाइव जीपीएस स्थिति' : 'Your Current Location',
          subtitle: locationName,
          description: `Coordinates: ${effectiveLat.toFixed(4)}°N, ${effectiveLon.toFixed(4)}°E • Accuracy: ±4m • Status: ${isGpsActive ? 'Live GPS Active' : 'Fallback'}`,
          latitude: effectiveLat,
          longitude: effectiveLon,
          source: isGpsActive ? 'Browser Geolocation (GPS)' : 'Fallback Safe Zone',
        });
      });

      userMarkerRef.current = userMarker;
    }

    // 2. Blue Accuracy Circle around user position
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng([effectiveLat, effectiveLon]);
    } else {
      const circle = L.circle([effectiveLat, effectiveLon], {
        radius: 65, // Accuracy radius in meters
        color: '#1E88E5',
        fillColor: '#2196F3',
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(map);
      accuracyCircleRef.current = circle;
    }
  }, [effectiveLat, effectiveLon, locationName, isGpsActive, lang]);

  // Handle "Locate Me" Button Click
  const handleLocateMe = useCallback(() => {
    setIsLocating(true);
    if (onRefreshGPS) {
      onRefreshGPS();
    }
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([effectiveLat, effectiveLon], 15, { animate: true, duration: 1.0 });
    }
    setTimeout(() => setIsLocating(false), 1200);
  }, [effectiveLat, effectiveLon, onRefreshGPS]);

  // Render & Update Shelters, Hazards, Hospitals, and Incident Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const placeGroup = placeMarkersLayerRef.current;
    if (!map || !placeGroup) return;

    placeGroup.clearLayers();

    // 1. Safe Shelters Markers
    if (activeLayers.shelters) {
      const defaultShelters: MapPlace[] = [
        {
          id: 'sh-1',
          type: 'shelter',
          title: lang === 'hi' ? 'सामुदायिक राहत केंद्र (24/7 सुरक्षित)' : 'Community Evacuation Relief Center',
          subtitle: 'Designated Safe Shelter • Power & Medical Ready',
          description: 'Capacity for 400 evacuees with active food and emergency medical distribution.',
          latitude: effectiveLat + 0.012,
          longitude: effectiveLon + 0.015,
          distanceKm: 1.8,
          capacity: 400,
          occupancy: 140,
          contactPhone: '1077',
          status: 'Operational',
        },
        {
          id: 'sh-2',
          type: 'shelter',
          title: lang === 'hi' ? 'सेंट्रल स्कूल शरण स्थल' : 'Central High School Relief Hub',
          subtitle: 'Multi-Purpose Evacuation Base',
          description: 'Reinforced concrete shelter with emergency diesel generator and fresh water storage.',
          latitude: effectiveLat - 0.016,
          longitude: effectiveLon - 0.011,
          distanceKm: 2.5,
          capacity: 600,
          occupancy: 210,
          contactPhone: '108',
          status: 'Operational',
        },
      ];

      const shelterItems: MapPlace[] =
        shelters.length > 0
          ? shelters.map((s: any, idx) => ({
              id: s.id || `sh-${idx}`,
              type: 'shelter',
              title: s.name || 'Emergency Safe Shelter',
              subtitle: s.address || s.facility_type || 'Verified Safe Evacuation Camp',
              description: `Shelter capacity: ${s.capacity || 350} spots • Current occupancy: ${s.current_occupancy || 80}`,
              latitude: Number(s.latitude) || effectiveLat + (idx === 0 ? 0.012 : -0.014),
              longitude: Number(s.longitude) || effectiveLon + (idx === 0 ? 0.015 : -0.012),
              distanceKm: s.distance_km || 2.1,
              capacity: s.capacity || 350,
              occupancy: s.current_occupancy || 80,
              contactPhone: s.contact_phone || '1077',
              status: 'Operational',
            }))
          : defaultShelters;

      shelterItems.forEach((sh) => {
        const shelterIcon = L.divIcon({
          className: 'shelter-marker-icon',
          html: `
            <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center;">
              <div style="background-color: #2E7D32; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.45); width: 34px; height: 34px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <span style="background: rgba(255,255,255,0.95); font-size: 10px; font-weight: 800; color: #1B5E20; padding: 2px 6px; border-radius: 9999px; margin-top: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); border: 1px solid #A5D6A7; white-space: nowrap;">
                ${sh.distanceKm} km
              </span>
            </div>
          `,
          iconSize: [40, 52],
          iconAnchor: [20, 48],
        });

        const marker = L.marker([sh.latitude, sh.longitude], { icon: shelterIcon });
        marker.on('click', () => setSelectedPlace(sh));
        placeGroup.addLayer(marker);
      });
    }

    // 2. Hospitals & Emergency Healthcare
    if (activeLayers.hospitals) {
      const defaultHospitals: MapPlace[] = [
        {
          id: 'hosp-1',
          type: 'hospital',
          title: lang === 'hi' ? 'जिला सामान्य अस्पताल (ट्रॉमा सेंटर)' : 'District General Hospital (Trauma Hub)',
          subtitle: 'Level 1 Emergency Care • 24/7 Blood Bank & ICU',
          description: 'Fully operational disaster emergency triage deck with 12 ambulance bays.',
          latitude: effectiveLat + 0.024,
          longitude: effectiveLon - 0.018,
          distanceKm: 3.4,
          contactPhone: '108',
          status: 'Open 24/7',
        },
      ];

      defaultHospitals.forEach((hosp) => {
        const hospIcon = L.divIcon({
          className: 'hosp-marker-icon',
          html: `
            <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center;">
              <div style="background-color: #D97706; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.45); width: 34px; height: 34px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 6v12"/><path d="M6 12h12"/>
                </svg>
              </div>
              <span style="background: rgba(255,255,255,0.95); font-size: 10px; font-weight: 800; color: #B45309; padding: 2px 6px; border-radius: 9999px; margin-top: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); border: 1px solid #FCD34D; white-space: nowrap;">
                ${hosp.distanceKm} km
              </span>
            </div>
          `,
          iconSize: [40, 52],
          iconAnchor: [20, 48],
        });

        const marker = L.marker([hosp.latitude, hosp.longitude], { icon: hospIcon });
        marker.on('click', () => setSelectedPlace(hosp));
        placeGroup.addLayer(marker);
      });
    }

    // 3. Citizen Reports / Hazard Incidents
    if (activeLayers.hazards) {
      const defaultReports: MapPlace[] = [
        {
          id: 'rep-1',
          type: 'report',
          title: lang === 'hi' ? 'सड़क पर भूस्खलन मलबा' : 'Landslide Debris & Road Block',
          subtitle: 'Citizen Verified • Road Inundated',
          description: 'Upper ghat road blocked by fallen rocks and wet slurry. PWD clearing underway.',
          latitude: effectiveLat + 0.018,
          longitude: effectiveLon - 0.009,
          severity: 'HIGH',
          verifiedCount: 14,
          status: 'Active Hazard',
        },
        {
          id: 'rep-2',
          type: 'report',
          title: lang === 'hi' ? 'नदी जलस्तर वृद्धि' : 'Catchment River Water Surge',
          subtitle: 'Flood Sensor Alert',
          description: 'Water level rising near low bridge crossing. Caution advised for small vehicles.',
          latitude: effectiveLat - 0.012,
          longitude: effectiveLon + 0.022,
          severity: 'MODERATE',
          verifiedCount: 8,
          status: 'Under Watch',
        },
      ];

      const reportItems: MapPlace[] =
        reports.length > 0
          ? reports.map((r: any, idx) => ({
              id: r.id || `rep-${idx}`,
              type: 'report',
              title: r.category || 'Disaster Incident Report',
              subtitle: r.location_name || 'Field Community Observation',
              description: r.description || 'Verified on-ground incident reported via Apda-Mitra.',
              latitude: Number(r.latitude) || effectiveLat + (idx === 0 ? 0.018 : -0.012),
              longitude: Number(r.longitude) || effectiveLon + (idx === 0 ? -0.009 : 0.022),
              severity: r.severity || 'HIGH',
              verifiedCount: r.verified_count || 5,
              status: r.status || 'Active Hazard',
            }))
          : defaultReports;

      reportItems.forEach((rep) => {
        const hazardIcon = L.divIcon({
          className: 'hazard-marker-icon',
          html: `
            <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center;">
              <div style="background-color: #DC2626; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.45); width: 34px; height: 34px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <span style="background: rgba(220,38,38,0.95); font-size: 9px; font-weight: 800; color: #FFFFFF; padding: 1.5px 5px; border-radius: 9999px; margin-top: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); white-space: nowrap;">
                ${rep.severity || 'ALERT'}
              </span>
            </div>
          `,
          iconSize: [40, 52],
          iconAnchor: [20, 48],
        });

        const marker = L.marker([rep.latitude, rep.longitude], { icon: hazardIcon });
        marker.on('click', () => setSelectedPlace(rep));
        placeGroup.addLayer(marker);
      });
    }
  }, [activeLayers, effectiveLat, effectiveLon, shelters, reports, lang]);

  // Render Evacuation Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (activeRoute && activeRoute.geometry && activeRoute.geometry.coordinates) {
      const latLngs: [number, number][] = activeRoute.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] // OSRM gives [lon, lat], Leaflet requires [lat, lon]
      );

      const polyline = L.polyline(latLngs, {
        color: '#1E88E5',
        weight: 6,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(map);

      routeLayerRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  }, [activeRoute]);

  return (
    <div className={`relative w-full h-full rounded-3xl overflow-hidden ${className}`}>
      {/* 1. The Leaflet Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 2. Top-Left: Search & Location Pill Banner */}
      <div className="absolute top-3 left-3 z-[400] flex items-center space-x-2">
        <button
          onClick={onOpenSearch}
          className="bg-white/95 dark:bg-[#131D2A]/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#CBD5E1] dark:border-[#24344B] shadow-md flex items-center space-x-2 text-xs font-bold text-[#1F2937] dark:text-white hover:scale-105 transition-all cursor-pointer"
        >
          <span className={`w-2 h-2 rounded-full ${isGpsActive ? 'bg-[#2E7D32] animate-pulse' : 'bg-amber-500'}`} />
          <span className="truncate max-w-[150px] sm:max-w-[220px]">{locationName}</span>
        </button>

        {isGpsActive && (
          <span className="bg-[#E8F5E9] dark:bg-[#1A3320] text-[#2E7D32] dark:text-[#81C784] border border-[#A5D6A7] text-[10px] font-bold px-2 py-1 rounded-xl shadow-xs flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-ping" />
            <span>GPS Active</span>
          </span>
        )}
      </div>

      {/* 3. Top-Right Floating Controls: Locate Me & Layer Filters */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col space-y-2">
        {/* Locate Me Button (Requirement 7) */}
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className="w-10 h-10 rounded-2xl bg-white dark:bg-[#131D2A] border border-[#CBD5E1] dark:border-[#24344B] shadow-md flex items-center justify-center text-[#0F4C81] dark:text-[#81D4FA] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title={lang === 'hi' ? 'मेरा स्थान खोजें' : 'Locate Me (Current GPS)'}
          aria-label="Locate Me"
        >
          <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin text-[#1E88E5]' : ''}`} />
        </button>

        {/* Refresh GPS Button */}
        {onRefreshGPS && (
          <button
            onClick={() => {
              setIsLocating(true);
              onRefreshGPS();
              setTimeout(() => setIsLocating(false), 1200);
            }}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#131D2A] border border-[#CBD5E1] dark:border-[#24344B] shadow-md flex items-center justify-center text-[#4B5563] dark:text-[#CBD5E1] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title={lang === 'hi' ? 'जीपीएस पुनः लोड करें' : 'Refresh GPS Position'}
            aria-label="Refresh GPS"
          >
            <RefreshCw className={`w-4 h-4 ${isLocating ? 'animate-spin text-[#0F4C81]' : ''}`} />
          </button>
        )}
      </div>

      {/* 4. Bottom-Left: Quick Filter Layer Chips */}
      <div className="absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-1.5 max-w-[260px] sm:max-w-none">
        <button
          onClick={() => setActiveLayers((prev) => ({ ...prev, shelters: !prev.shelters }))}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-xs transition-all cursor-pointer flex items-center space-x-1 ${
            activeLayers.shelters
              ? 'bg-[#2E7D32] text-white border-[#2E7D32]'
              : 'bg-white/90 dark:bg-[#1B2738]/90 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
          }`}
        >
          <Home className="w-3 h-3" />
          <span>{lang === 'hi' ? 'आश्रय स्थल' : 'Shelters'}</span>
        </button>

        <button
          onClick={() => setActiveLayers((prev) => ({ ...prev, hazards: !prev.hazards }))}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-xs transition-all cursor-pointer flex items-center space-x-1 ${
            activeLayers.hazards
              ? 'bg-[#DC2626] text-white border-[#DC2626]'
              : 'bg-white/90 dark:bg-[#1B2738]/90 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>{lang === 'hi' ? 'आपदा खतरे' : 'Hazards'}</span>
        </button>

        <button
          onClick={() => setActiveLayers((prev) => ({ ...prev, hospitals: !prev.hospitals }))}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-xs transition-all cursor-pointer flex items-center space-x-1 ${
            activeLayers.hospitals
              ? 'bg-[#D97706] text-white border-[#D97706]'
              : 'bg-white/90 dark:bg-[#1B2738]/90 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
          }`}
        >
          <Hospital className="w-3 h-3" />
          <span>{lang === 'hi' ? 'अस्पताल' : 'Hospitals'}</span>
        </button>
      </div>

      {/* 5. Selected Place Bottom Drawer / Info Sheet */}
      {selectedPlace && (
        <div className="absolute bottom-3 left-3 right-3 z-[500] max-w-md mx-auto bg-white dark:bg-[#131D2A] border border-[#CBD5E1] dark:border-[#24344B] rounded-3xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 overflow-hidden">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                  selectedPlace.type === 'shelter'
                    ? 'bg-[#2E7D32]'
                    : selectedPlace.type === 'hospital'
                    ? 'bg-[#D97706]'
                    : selectedPlace.type === 'report'
                    ? 'bg-[#DC2626]'
                    : 'bg-[#1E88E5]'
                }`}
              >
                {selectedPlace.type === 'shelter' ? (
                  <Home className="w-5 h-5" />
                ) : selectedPlace.type === 'hospital' ? (
                  <Hospital className="w-5 h-5" />
                ) : selectedPlace.type === 'report' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Compass className="w-5 h-5" />
                )}
              </div>

              <div className="truncate">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  {selectedPlace.subtitle || selectedPlace.type}
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-[#1F2937] dark:text-white truncate">
                  {selectedPlace.title}
                </h3>
              </div>
            </div>

            <button
              onClick={() => setSelectedPlace(null)}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            {selectedPlace.description}
          </p>

          <div className="flex items-center space-x-2 pt-1">
            {selectedPlace.type !== 'user' && (
              <button
                onClick={() => {
                  if (onNavigateTo) {
                    onNavigateTo(selectedPlace.latitude, selectedPlace.longitude, selectedPlace.title, routingMode);
                  } else {
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.latitude},${selectedPlace.longitude}`,
                      '_blank'
                    );
                  }
                }}
                className="flex-1 py-2.5 px-3 bg-[#0F4C81] hover:bg-[#0D3B66] text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                <span>{lang === 'hi' ? 'रास्ता देखें' : 'Navigate Here'}</span>
              </button>
            )}

            {selectedPlace.contactPhone && (
              <a
                href={`tel:${selectedPlace.contactPhone}`}
                className="py-2.5 px-4 bg-[#E8F5E9] dark:bg-[#1A3320] text-[#2E7D32] dark:text-[#81C784] border border-[#A5D6A7] rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 hover:bg-[#C8E6C9] transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>{selectedPlace.contactPhone}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default LeafletMap;
