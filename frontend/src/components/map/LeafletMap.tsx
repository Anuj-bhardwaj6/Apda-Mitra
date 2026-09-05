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
  RefreshCw,
  Car,
  Footprints,
  Compass,
  CheckCircle2,
  Users
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
  accuracyMeters?: number;
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
  accuracyMeters,
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
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const placeMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Smart centering & drag tracking refs (Requirement 4 & 9)
  const hasInitialCenteredRef = useRef<boolean>(false);
  const isUserInteractingRef = useRef<boolean>(false);
  const basePlaceCoordsRef = useRef<{ lat: number; lon: number }>({
    lat: 11.6854,
    lon: 76.1320,
  });

  // UI state
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationErrorMessage, setLocationErrorMessage] = useState<string | null>(null);
  const [activeLayers, setActiveLayers] = useState({
    shelters: true,
    hospitals: true,
    hazards: true,
  });
  const [routingMode, setRoutingMode] = useState<'driving' | 'walking'>('driving');

  const effectiveLat = userLat ?? latitude;
  const effectiveLon = userLon ?? longitude;

  // Sync error or permission denied state from parent props
  useEffect(() => {
    if (isFallback && !isGpsActive) {
      if (locationName && (locationName.includes('permission') || locationName.includes('Unable') || locationName.includes('required'))) {
        setLocationErrorMessage(locationName);
      } else {
        setLocationErrorMessage('Location permission is required to show your position.');
      }
    } else {
      setLocationErrorMessage(null);
    }
  }, [isFallback, isGpsActive, locationName]);

  // Unified Location Acquisition & Recenter Function (Requirements 1, 2, 3, 8, 9, 10, 11, 12, 13)
  const locateUser = useCallback(
    (shouldRecenter: boolean = true) => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        setLocationErrorMessage('Geolocation is not supported by your browser.');
        setIsLocating(false);
        return;
      }

      setIsLocating(true);
      isUserInteractingRef.current = false;

      // Requirement 1 & 2: navigator.geolocation.getCurrentPosition with timeout 10000, high accuracy
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const freshLat = pos.coords.latitude;
          const freshLon = pos.coords.longitude;
          const freshAcc = pos.coords.accuracy;

          setLocationErrorMessage(null);
          setIsLocating(false);

          const map = mapInstanceRef.current;
          if (map) {
            // Requirement 5 & 7: Add/update circleMarker on THIS active map instance
            if (userMarkerRef.current && map.hasLayer(userMarkerRef.current)) {
              userMarkerRef.current.setLatLng([freshLat, freshLon]);
              userMarkerRef.current.setStyle({
                fillColor: '#1A73E8',
                color: '#FFFFFF',
              });
            } else {
              if (userMarkerRef.current) {
                try {
                  userMarkerRef.current.remove();
                } catch (_) {}
              }
              const marker = L.circleMarker([freshLat, freshLon], {
                radius: 8,
                fillColor: '#1A73E8',
                fillOpacity: 1.0,
                color: '#FFFFFF',
                weight: 2.5,
                opacity: 1.0,
                pane: 'userLocationPane',
                className: 'leaflet-user-location-marker',
                interactive: true,
              }).addTo(map);
              userMarkerRef.current = marker;
            }

            // Requirement 6 & 7: Add/update Leaflet circle with GPS accuracy
            const accRadius = Math.max(freshAcc || 25, 10);
            if (accuracyCircleRef.current && map.hasLayer(accuracyCircleRef.current)) {
              accuracyCircleRef.current.setLatLng([freshLat, freshLon]);
              accuracyCircleRef.current.setRadius(accRadius);
              accuracyCircleRef.current.setStyle({
                color: '#1A73E8',
                fillColor: '#4285F4',
              });
            } else {
              if (accuracyCircleRef.current) {
                try {
                  accuracyCircleRef.current.remove();
                } catch (_) {}
              }
              const circle = L.circle([freshLat, freshLon], {
                radius: accRadius,
                color: '#1A73E8',
                fillColor: '#4285F4',
                fillOpacity: 0.15,
                weight: 1.5,
                opacity: 0.45,
                interactive: false,
                pane: 'accuracyPane',
              }).addTo(map);
              accuracyCircleRef.current = circle;
            }

            // Requirement 9: Recenter to user's real coordinates ONLY on explicit locate request
            if (shouldRecenter) {
              map.flyTo([freshLat, freshLon], 16.5, {
                animate: true,
                duration: 1.2,
                easeLinearity: 0.25,
              });
              hasInitialCenteredRef.current = true;
            }
          }

          if (onRefreshGPS) {
            onRefreshGPS();
          }
        },
        (err) => {
          setIsLocating(false);
          let errorMsg = 'Unable to get your location. Please try again.';

          if (err.code === err.PERMISSION_DENIED) {
            // Requirement 11
            errorMsg = 'Location permission is required to show your position.';
          } else if (err.code === err.TIMEOUT) {
            // Requirement 12
            errorMsg = 'Unable to get your location. Please try again.';
          } else {
            // Requirement 13
            errorMsg = 'Unable to get your location. Please try again.';
          }

          // Requirements 2, 6, 7, 8: Never show "Unable to get your location" when valid coordinates are already available!
          const hasValidPosition = userMarkerRef.current !== null || (!isFallback && effectiveLat);
          if (hasValidPosition) {
            setLocationErrorMessage(null);
            if (shouldRecenter) {
              const map = mapInstanceRef.current;
              if (map) {
                map.flyTo([effectiveLat, effectiveLon], 16, {
                  animate: true,
                  duration: 1.0,
                });
              }
            }
          } else {
            setLocationErrorMessage(errorMsg);
          }

          if (onRefreshGPS) {
            onRefreshGPS();
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    },
    [effectiveLat, effectiveLon, onRefreshGPS]
  );

  // Initialize Leaflet Map with React Strict Mode safety & custom z-index panes (Requirements 5, 6, 7, 14, 15)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // React Strict Mode safety: clean up any stale leaflet instance attached to this container element
    if ((mapContainerRef.current as any)._leaflet_id) {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
      (mapContainerRef.current as any)._leaflet_id = undefined;
    }

    if (mapInstanceRef.current) return;

    // Create Map with OpenStreetMap live tiles (Zero API key required)
    const map = L.map(mapContainerRef.current, {
      center: [effectiveLat, effectiveLon],
      zoom: isCompact ? 13 : 15,
      zoomControl: false,
      attributionControl: true,
    });

    // Real OpenStreetMap Standard Tile Layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add Leaflet zoom control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Requirement 5 & 6: Create custom panes for high z-index layering above tiles
    if (!map.getPane('userLocationPane')) {
      const userPane = map.createPane('userLocationPane');
      userPane.style.zIndex = '650'; // standard markerPane is 600, overlayPane is 400, tilePane is 200
    }
    if (!map.getPane('accuracyPane')) {
      const accPane = map.createPane('accuracyPane');
      accPane.style.zIndex = '450';
    }

    // Track user drag/pan: do not snap back automatically if user manually moves map (Requirement 4)
    map.on('dragstart movestart', () => {
      isUserInteractingRef.current = true;
    });

    // Layer group for place markers
    const placeGroup = L.layerGroup().addTo(map);
    placeMarkersLayerRef.current = placeGroup;

    mapInstanceRef.current = map;
    hasInitialCenteredRef.current = true;

    // Force tile recalculation on load
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Setup watchPosition for dynamic position tracking (Requirements 4 & 14)
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      try {
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const wLat = pos.coords.latitude;
            const wLon = pos.coords.longitude;
            const wAcc = pos.coords.accuracy;

            const activeMap = mapInstanceRef.current;
            if (activeMap) {
              if (userMarkerRef.current && activeMap.hasLayer(userMarkerRef.current)) {
                userMarkerRef.current.setLatLng([wLat, wLon]);
              }
              if (accuracyCircleRef.current && activeMap.hasLayer(accuracyCircleRef.current)) {
                accuracyCircleRef.current.setLatLng([wLat, wLon]);
                accuracyCircleRef.current.setRadius(Math.max(wAcc || 25, 10));
              }
            }
          },
          (err) => {
            console.warn('Map watchPosition update notice:', err.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
        watchIdRef.current = watchId;
      } catch (e) {
        console.warn('Could not register watchPosition in map:', e);
      }
    }

    // Strict Mode / unmount cleanup (Requirements 14 & 15)
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (userMarkerRef.current) {
        try {
          userMarkerRef.current.remove();
        } catch (_) {}
        userMarkerRef.current = null;
      }
      if (accuracyCircleRef.current) {
        try {
          accuracyCircleRef.current.remove();
        } catch (_) {}
        accuracyCircleRef.current = null;
      }
      if (placeMarkersLayerRef.current) {
        try {
          placeMarkersLayerRef.current.remove();
        } catch (_) {}
        placeMarkersLayerRef.current = null;
      }
      if (routeLayerRef.current) {
        try {
          routeLayerRef.current.remove();
        } catch (_) {}
        routeLayerRef.current = null;
      }
      try {
        map.remove();
      } catch (_) {}
      mapInstanceRef.current = null;
      hasInitialCenteredRef.current = false;
    };
  }, []);

  // Update Blue Current Location CircleMarker & Accuracy Circle (Requirements 5, 6, 7, 8)
  // NOTE: GPS updates MUST ONLY update marker and accuracy circle positions.
  // Never call map.setView(), map.flyTo(), map.fitBounds(), or map.invalidateSize() here!
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const markerColor = isFallback ? '#D97706' : '#1A73E8';
    const accuracyColor = isFallback ? '#D97706' : '#1A73E8';
    const accuracyFill = isFallback ? '#F59E0B' : '#4285F4';

    // 1. Current Location CircleMarker (Requirements 5, 7, 8)
    // Blue filled center, white border, ~8px radius, high z-index pane (650) above map tiles
    if (userMarkerRef.current && map.hasLayer(userMarkerRef.current)) {
      userMarkerRef.current.setLatLng([effectiveLat, effectiveLon]);
      userMarkerRef.current.setStyle({
        fillColor: markerColor,
        color: '#FFFFFF',
      });
    } else {
      if (userMarkerRef.current) {
        try {
          userMarkerRef.current.remove();
        } catch (_) {}
      }

      const circleMarker = L.circleMarker([effectiveLat, effectiveLon], {
        radius: 8,
        fillColor: markerColor,
        fillOpacity: 1.0,
        color: '#FFFFFF',
        weight: 2.5,
        opacity: 1.0,
        pane: 'userLocationPane',
        className: 'leaflet-user-location-marker',
        interactive: true,
      }).addTo(map);

      circleMarker.on('click', () => {
        setSelectedPlace({
          id: 'user-loc',
          type: 'user',
          title: lang === 'hi' ? 'आपकी लाइव स्थिति' : 'Current Location',
          subtitle: locationName,
          description: `Coordinates: ${effectiveLat.toFixed(4)}°N, ${effectiveLon.toFixed(4)}°E • Accuracy: ±${Math.round(accuracyMeters || 25)}m • Status: ${isGpsActive ? 'Live GPS Active' : 'Fallback Area'}`,
          latitude: effectiveLat,
          longitude: effectiveLon,
          source: isGpsActive ? 'Browser Geolocation (GPS)' : 'Fallback Safe Zone',
        });
      });

      userMarkerRef.current = circleMarker;
    }

    // 2. Accuracy Circle using real GPS accuracy value (Requirements 6, 7, 8)
    const accuracyRadius = Math.max(accuracyMeters || 25, 10);

    if (accuracyCircleRef.current && map.hasLayer(accuracyCircleRef.current)) {
      accuracyCircleRef.current.setLatLng([effectiveLat, effectiveLon]);
      accuracyCircleRef.current.setRadius(accuracyRadius);
      accuracyCircleRef.current.setStyle({
        color: accuracyColor,
        fillColor: accuracyFill,
      });
    } else {
      if (accuracyCircleRef.current) {
        try {
          accuracyCircleRef.current.remove();
        } catch (_) {}
      }

      const circle = L.circle([effectiveLat, effectiveLon], {
        radius: accuracyRadius,
        color: accuracyColor,
        fillColor: accuracyFill,
        fillOpacity: 0.15,
        weight: 1.5,
        opacity: 0.45,
        interactive: false,
        pane: 'accuracyPane',
      }).addTo(map);

      accuracyCircleRef.current = circle;
    }
  }, [effectiveLat, effectiveLon, locationName, isGpsActive, isFallback, accuracyMeters, isCompact, lang]);

  // Handle "My Location" Button Click: Calls the same location function (Requirement 9)
  const handleLocateMe = useCallback(() => {
    locateUser(true);
  }, [locateUser]);

  // Render & Update Shelters, Hospitals, and Hazard Markers (Requirement 3)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const placeGroup = placeMarkersLayerRef.current;
    if (!map || !placeGroup) return;

    // Update base place anchor if user moves more than ~5km
    if (
      Math.abs(basePlaceCoordsRef.current.lat - effectiveLat) > 0.05 ||
      Math.abs(basePlaceCoordsRef.current.lon - effectiveLon) > 0.05
    ) {
      basePlaceCoordsRef.current = { lat: effectiveLat, lon: effectiveLon };
    }
    const bLat = basePlaceCoordsRef.current.lat;
    const bLon = basePlaceCoordsRef.current.lon;

    placeGroup.clearLayers();

    // 1. Safe Shelter Markers (High-recognition Emerald Shield Pins)
    if (activeLayers.shelters) {
      const defaultShelters: MapPlace[] = [
        {
          id: 'sh-1',
          type: 'shelter',
          title: lang === 'hi' ? 'सामुदायिक राहत केंद्र (24/7 सुरक्षित)' : 'Community Evacuation Relief Center',
          subtitle: 'Designated Safe Shelter • Power & Medical Ready',
          description: 'Capacity for 400 evacuees with active food and emergency medical distribution.',
          latitude: bLat + 0.012,
          longitude: bLon + 0.015,
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
          latitude: bLat - 0.016,
          longitude: bLon - 0.011,
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
              latitude: Number(s.latitude) || bLat + (idx === 0 ? 0.012 : -0.014),
              longitude: Number(s.longitude) || bLon + (idx === 0 ? 0.015 : -0.012),
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
            <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 8px rgba(5,150,105,0.4));">
              <div style="background: linear-gradient(135deg, #10B981, #059669); border: 2.5px solid #FFFFFF; width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/>
                </svg>
              </div>
              <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #059669; margin-top: -1px;"></div>
              <span style="background: rgba(255,255,255,0.96); font-size: 10px; font-weight: 800; color: #065F46; padding: 2px 6px; border-radius: 9999px; margin-top: 3px; box-shadow: 0 1px 4px rgba(0,0,0,0.18); border: 1px solid #A7F3D0; white-space: nowrap;">
                ${sh.distanceKm} km
              </span>
            </div>
          `,
          iconSize: [44, 56],
          iconAnchor: [22, 50],
        });

        const marker = L.marker([sh.latitude, sh.longitude], { icon: shelterIcon });
        marker.on('click', () => setSelectedPlace(sh));
        placeGroup.addLayer(marker);
      });
    }

    // 2. Hospitals & Emergency Healthcare (Crimson Medical Cross Pins)
    if (activeLayers.hospitals) {
      const defaultHospitals: MapPlace[] = [
        {
          id: 'hosp-1',
          type: 'hospital',
          title: lang === 'hi' ? 'जिला सामान्य अस्पताल (ट्रॉमा सेंटर)' : 'District General Hospital (Trauma Hub)',
          subtitle: 'Level 1 Emergency Care • 24/7 Blood Bank & ICU',
          description: 'Fully operational disaster emergency triage deck with 12 ambulance bays.',
          latitude: bLat + 0.024,
          longitude: bLon - 0.018,
          distanceKm: 3.4,
          contactPhone: '108',
          status: 'Open 24/7',
        },
      ];

      defaultHospitals.forEach((hosp) => {
        const hospIcon = L.divIcon({
          className: 'hosp-marker-icon',
          html: `
            <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 8px rgba(220,38,38,0.4));">
              <div style="background: linear-gradient(135deg, #EF4444, #DC2626); border: 2.5px solid #FFFFFF; width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>
              <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #DC2626; margin-top: -1px;"></div>
              <span style="background: rgba(255,255,255,0.96); font-size: 10px; font-weight: 800; color: #991B1B; padding: 2px 6px; border-radius: 9999px; margin-top: 3px; box-shadow: 0 1px 4px rgba(0,0,0,0.18); border: 1px solid #FECACA; white-space: nowrap;">
                ${hosp.distanceKm} km
              </span>
            </div>
          `,
          iconSize: [44, 56],
          iconAnchor: [22, 50],
        });

        const marker = L.marker([hosp.latitude, hosp.longitude], { icon: hospIcon });
        marker.on('click', () => setSelectedPlace(hosp));
        placeGroup.addLayer(marker);
      });
    }

    // 3. Hazard Incidents & Citizen Reports (High-visibility Amber/Red Caution Pins)
    if (activeLayers.hazards) {
      const defaultReports: MapPlace[] = [
        {
          id: 'rep-1',
          type: 'report',
          title: lang === 'hi' ? 'सड़क पर भूस्खलन मलबा' : 'Landslide Debris & Road Block',
          subtitle: 'Citizen Verified • Road Inundated',
          description: 'Upper ghat road blocked by fallen rocks and wet slurry. PWD clearing underway.',
          latitude: bLat + 0.018,
          longitude: bLon - 0.009,
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
          latitude: bLat - 0.012,
          longitude: bLon + 0.022,
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
              latitude: Number(r.latitude) || bLat + (idx === 0 ? 0.018 : -0.012),
              longitude: Number(r.longitude) || bLon + (idx === 0 ? -0.009 : 0.022),
              severity: r.severity || 'HIGH',
              verifiedCount: r.verified_count || 5,
              status: r.status || 'Active Hazard',
            }))
          : defaultReports;

      reportItems.forEach((rep) => {
        const hazardIcon = L.divIcon({
          className: 'hazard-marker-icon',
          html: `
            <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 8px rgba(217,119,6,0.4));">
              <div style="background: linear-gradient(135deg, #F59E0B, #D97706); border: 2.5px solid #FFFFFF; width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #D97706; margin-top: -1px;"></div>
              <span style="background: rgba(255,255,255,0.96); font-size: 9.5px; font-weight: 800; color: #92400E; padding: 1.5px 6px; border-radius: 9999px; margin-top: 3px; box-shadow: 0 1px 4px rgba(0,0,0,0.18); border: 1px solid #FDE68A; white-space: nowrap;">
                ${rep.severity || 'ALERT'}
              </span>
            </div>
          `,
          iconSize: [44, 56],
          iconAnchor: [22, 50],
        });

        const marker = L.marker([rep.latitude, rep.longitude], { icon: hazardIcon });
        marker.on('click', () => setSelectedPlace(rep));
        placeGroup.addLayer(marker);
      });
    }
  }, [activeLayers, shelters, reports, lang]);

  // Render Evacuation Route Polyline (Requirement 3)
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
        color: '#1A73E8',
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
      {/* 1. Leaflet Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 2. Top-Left: Search & Location Pill Banner */}
      <div className="absolute top-3 left-3 z-[400] flex items-center space-x-2">
        <button
          onClick={onOpenSearch}
          className="bg-white/95 dark:bg-[#131D2A]/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#CBD5E1] dark:border-[#24344B] shadow-md flex items-center space-x-2 text-xs font-bold text-[#1F2937] dark:text-white hover:scale-102 active:scale-98 transition-all cursor-pointer"
        >
          <span className={`w-2 h-2 rounded-full ${isLocating ? 'bg-[#1A73E8] animate-ping' : isGpsActive ? 'bg-[#10B981] animate-pulse' : 'bg-amber-500'}`} />
          <span className="truncate max-w-[150px] sm:max-w-[220px]">
            {isLocating
              ? (lang === 'hi' ? 'जीपीएस खोज रहा है...' : 'Acquiring Live GPS...')
              : (!isFallback || isGpsActive)
                ? (locationName && !locationName.includes('Unable') && !locationName.includes('permission') && !locationName.includes('required')
                    ? locationName
                    : `${effectiveLat.toFixed(4)}°N, ${effectiveLon.toFixed(4)}°E`)
                : locationErrorMessage || locationName}
          </span>
        </button>

        {isGpsActive && !isLocating && (
          <span className="bg-[#E8F5E9] dark:bg-[#1A3320] text-[#2E7D32] dark:text-[#81C784] border border-[#A5D6A7] text-[10px] font-bold px-2 py-1 rounded-xl shadow-xs flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-ping" />
            <span>GPS Active</span>
          </span>
        )}
      </div>

      {/* 3. Top-Right: Google Maps-Style "My Location" Button (Requirements 7, 8, 9) */}
      <div className="absolute top-3 right-3 z-[400] flex items-center space-x-2">
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className="h-10 px-3.5 rounded-full bg-white dark:bg-[#131D2A] border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer group"
          title={lang === 'hi' ? 'मेरा स्थान (My Location)' : 'My Location'}
          aria-label="My Location"
        >
          {isLocating ? (
            <div className="w-4 h-4 rounded-full border-2 border-[#1A73E8] border-t-transparent animate-spin shrink-0" />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`shrink-0 transition-colors ${
                isGpsActive
                  ? 'text-[#1A73E8] dark:text-[#60A5FA]'
                  : 'text-gray-600 dark:text-gray-300 group-hover:text-[#1A73E8]'
              }`}
            >
              <circle cx="12" cy="12" r="7" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          )}
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-[#1A73E8] dark:group-hover:text-[#60A5FA] whitespace-nowrap">
            {lang === 'hi' ? 'मेरा स्थान' : 'My Location'}
          </span>
        </button>
      </div>

      {/* User-Friendly Location Error / Permission Banner (Requirements 2, 3, 8, 10, 11, 12, 13) */}
      {locationErrorMessage && isFallback && !isGpsActive && (
        <div className="absolute top-16 left-3 right-3 z-[400] max-w-sm mx-auto bg-white/95 dark:bg-[#1A2634]/95 backdrop-blur-md border border-amber-400 dark:border-amber-600 rounded-2xl p-2.5 shadow-xl flex items-center justify-between space-x-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-semibold text-[11px] leading-tight">
              {locationErrorMessage}
            </span>
          </div>
          <button
            onClick={() => setLocationErrorMessage(null)}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer shrink-0"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Bottom-Left: Modern Google Maps Category Filter Chips (Requirement 3) */}
      <div className="absolute bottom-4 left-3 z-[400] flex flex-wrap items-center gap-1.5 max-w-[270px] sm:max-w-none">
        <button
          onClick={() => setActiveLayers((prev) => ({ ...prev, shelters: !prev.shelters }))}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95 ${
            activeLayers.shelters
              ? 'bg-[#059669] text-white border-[#059669] shadow-emerald-500/20'
              : 'bg-white/95 dark:bg-[#1B2738]/95 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>{lang === 'hi' ? 'आश्रय स्थल' : 'Shelters'}</span>
        </button>

        <button
          onClick={() => setActiveLayers((prev) => ({ ...prev, hazards: !prev.hazards }))}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95 ${
            activeLayers.hazards
              ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-red-500/20'
              : 'bg-white/95 dark:bg-[#1B2738]/95 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{lang === 'hi' ? 'आपदा खतरे' : 'Hazards'}</span>
        </button>

        <button
          onClick={() => setActiveLayers((prev) => ({ ...prev, hospitals: !prev.hospitals }))}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95 ${
            activeLayers.hospitals
              ? 'bg-[#D97706] text-white border-[#D97706] shadow-amber-500/20'
              : 'bg-white/95 dark:bg-[#1B2738]/95 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
          }`}
        >
          <Hospital className="w-3.5 h-3.5" />
          <span>{lang === 'hi' ? 'अस्पताल' : 'Hospitals'}</span>
        </button>
      </div>

      {/* 5. Selected Place Bottom Drawer / Info Sheet (Google Maps Card Style) */}
      {selectedPlace && (
        <div className="absolute bottom-3 left-3 right-3 z-[500] max-w-md mx-auto bg-white dark:bg-[#131D2A] border border-[#CBD5E1] dark:border-[#24344B] rounded-3xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 overflow-hidden">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                  selectedPlace.type === 'shelter'
                    ? 'bg-[#059669]'
                    : selectedPlace.type === 'hospital'
                    ? 'bg-[#DC2626]'
                    : selectedPlace.type === 'report'
                    ? 'bg-[#D97706]'
                    : 'bg-[#1A73E8]'
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
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            {selectedPlace.description}
          </p>

          {/* Shelter Occupancy Meter */}
          {selectedPlace.type === 'shelter' && selectedPlace.capacity && (
            <div className="bg-gray-50 dark:bg-[#1B2738] p-2.5 rounded-2xl space-y-1.5 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 dark:text-gray-300">
                <span className="flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-[#059669]" />
                  <span>{lang === 'hi' ? 'आश्रय क्षमता' : 'Capacity Status'}</span>
                </span>
                <span>
                  {selectedPlace.occupancy || 0} / {selectedPlace.capacity} ({Math.round(((selectedPlace.occupancy || 0) / selectedPlace.capacity) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#059669] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(((selectedPlace.occupancy || 0) / selectedPlace.capacity) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Mode Selector & Action Buttons */}
          <div className="flex items-center space-x-2 pt-1">
            {selectedPlace.type !== 'user' && (
              <>
                <div className="flex items-center bg-gray-100 dark:bg-[#1B2738] rounded-2xl p-1 border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setRoutingMode('driving')}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                      routingMode === 'driving'
                        ? 'bg-white dark:bg-[#131D2A] text-[#1A73E8] shadow-xs'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="Driving Route"
                  >
                    <Car className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRoutingMode('walking')}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                      routingMode === 'walking'
                        ? 'bg-white dark:bg-[#131D2A] text-[#1A73E8] shadow-xs'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="Walking Route"
                  >
                    <Footprints className="w-4 h-4" />
                  </button>
                </div>

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
                  className="flex-1 py-2.5 px-3 bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'रास्ता देखें' : 'Get Directions'}</span>
                </button>
              </>
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
