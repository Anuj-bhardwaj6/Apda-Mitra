"use client";

import { useQuery } from "@tanstack/react-query";

export interface UnifiedTelemetryData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  generated_at: string;
  nasa_observations: {
    rainfall: {
      card_title: string;
      value_mm: number | null;
      display_value: string;
      period: string;
      observation_time: string | null;
      latency_minutes: number | null;
      fetched_at: string;
      status: "LIVE" | "STALE" | "UNAVAILABLE";
      source: string;
      source_product: string;
      trend_3h_mm: number | null;
    };
    soil_moisture: {
      card_title: string;
      soil_moisture_percent: number | null;
      display_value: string;
      observation_time: string | null;
      fetched_at: string;
      status: "LIVE" | "STALE" | "UNAVAILABLE";
      source: string;
      source_product: string;
    };
    terrain: {
      card_title: string;
      elevation: number | null;
      slope: number | null;
      aspect: number | null;
      curvature: number | null;
      display_value: string;
      source: string;
      source_product: string;
      status: "LIVE" | "STALE" | "UNAVAILABLE";
    };
  };
  nasa_nowcast: {
    card_title: string;
    hazard_level: "HIGH" | "MODERATE" | "LOW" | "UNAVAILABLE";
    display_value: string;
    updated_at: string | null;
    fetched_at: string;
    source: string;
    model_version: string;
    status: "LIVE" | "STALE" | "UNAVAILABLE";
  };
  apda_mitra_ai_prediction: {
    card_title: string;
    status: "available" | "model_unavailable" | "missing_features";
    risk_probability: number | null;
    risk_percentage: number | null;
    risk_level: string;
    display_value: string;
    model_version: string | null;
    top_factors: Array<{
      rank: number;
      feature: string;
      contribution: string;
      impact: string;
    }>;
    source: string;
    generated_at: string | null;
  };
}

export interface LiveCoolrEvent {
  id: string;
  event_title: string;
  event_date: string;
  latitude: number;
  longitude: number;
  trigger: string;
  category: string;
  location_description: string;
  source: string;
  source_catalog: string;
  source_event_id: string;
}

export interface LiveCoolrResponse {
  source: string;
  fetched_at: string;
  status: "LIVE" | "STALE" | "UNAVAILABLE";
  count: number;
  events: LiveCoolrEvent[];
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * React Query hook for Unified Telemetry (GPM IMERG, SMAP, Copernicus DEM, LHASA, XGBoost)
 * Polling Interval: 10 minutes (600,000 ms)
 */
export function useUnifiedTelemetry(lat: number, lon: number, isLive: boolean = true) {
  return useQuery<UnifiedTelemetryData>({
    queryKey: ["unified_telemetry", lat, lon],
    queryFn: async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/telemetry/unified?latitude=${lat}&longitude=${lon}`
        );
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn("[Telemetry] Direct backend fetch failed, trying proxy /api/telemetry/unified", err);
      }

      // Fallback to relative endpoint if proxy exists
      const resFallback = await fetch(
        `/api/telemetry/unified?latitude=${lat}&longitude=${lon}`
      );
      if (!resFallback.ok) {
        throw new Error(`Failed to fetch telemetry: ${resFallback.statusText}`);
      }
      return await resFallback.json();
    },
    enabled: isLive && !isNaN(lat) && !isNaN(lon),
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    staleTime: 5 * 60 * 1000,        // 5 minutes
  });
}

/**
 * React Query hook for NASA COOLR Landslide Events Layer
 * Polling Interval: 20 minutes (1,200,000 ms)
 */
export function useLiveCoolrLandslides(isLive: boolean = true) {
  return useQuery<LiveCoolrResponse>({
    queryKey: ["live_coolr_landslides"],
    queryFn: async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/landslides/live?limit=50`);
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn("[COOLR] Direct backend fetch failed, trying proxy /api/landslides/live", err);
      }

      const resFallback = await fetch(`/api/landslides/live?limit=50`);
      if (!resFallback.ok) {
        throw new Error(`Failed to fetch live landslides: ${resFallback.statusText}`);
      }
      return await resFallback.json();
    },
    enabled: isLive,
    refetchInterval: 20 * 60 * 1000, // 20 minutes
    staleTime: 10 * 60 * 1000,       // 10 minutes
  });
}

/**
 * React Query hook for Authoritative Early Warning Alerts
 * Polling Interval: 10 minutes (600,000 ms)
 */
export function useLiveAlerts(isLive: boolean = true) {
  return useQuery<{
    source: string;
    fetched_at: string;
    status: string;
    alerts: Array<{
      id: string;
      title: string;
      severity: string;
      message: string;
      authority: string;
      published_at: string;
    }>;
  }>({
    queryKey: ["live_alerts"],
    queryFn: async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/alerts/live`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // graceful
      }
      const resFallback = await fetch(`/api/alerts/live`);
      if (!resFallback.ok) {
        throw new Error("Failed to fetch live alerts");
      }
      return await resFallback.json();
    },
    enabled: isLive,
    refetchInterval: 10 * 60 * 1000,
  });
}

export interface StateOverviewItem {
  id: string;
  slug: string;
  state: string;
  name_hi?: string;
  centroid: [number, number];
  data_status: "LIVE" | "STALE" | "ERROR" | "UNAVAILABLE";
  nasa_hazard_status: "HIGH" | "MODERATE" | "LOW" | "UNAVAILABLE";
  ai_status: "AVAILABLE" | "MODEL NOT AVAILABLE";
  last_updated: string;
}

export interface RegionalOverviewData {
  region: string;
  generated_at: string;
  states_monitored: number;
  counts: {
    high_risk: number;
    moderate_risk: number;
    low_risk: number;
    data_unavailable: number;
  };
  ai_risk_status: string;
  bbox: { min_lat: number; max_lat: number; min_lon: number; max_lon: number };
  states: StateOverviewItem[];
}

/**
 * React Query hook for 10-State Regional Overview
 */
export function useRegionalOverview(isLive: boolean = true) {
  return useQuery<RegionalOverviewData>({
    queryKey: ["regional_overview"],
    queryFn: async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/region/overview`);
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
      const resFallback = await fetch(`/api/region/overview`);
      if (!resFallback.ok) {
        throw new Error("Failed to fetch regional overview");
      }
      return await resFallback.json();
    },
    enabled: isLive,
    refetchInterval: 5 * 60 * 1000, // 5 min
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * React Query hook for Regional Landslides across the 10 target states
 */
export function useRegionalLandslides(limit: number = 100, isLive: boolean = true) {
  return useQuery<LiveCoolrResponse>({
    queryKey: ["regional_landslides", limit],
    queryFn: async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/landslides/region?limit=${limit}`);
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
      const resFallback = await fetch(`/api/landslides/region?limit=${limit}`);
      if (!resFallback.ok) {
        throw new Error("Failed to fetch regional landslides");
      }
      return await resFallback.json();
    },
    enabled: isLive,
    refetchInterval: 15 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * React Query hook for State-specific Landslides
 */
export function useStateLandslides(stateSlug: string, limit: number = 50, isLive: boolean = true) {
  return useQuery<LiveCoolrResponse>({
    queryKey: ["state_landslides", stateSlug, limit],
    queryFn: async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/landslides/state/${stateSlug}?limit=${limit}`);
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
      const resFallback = await fetch(`/api/landslides/state/${stateSlug}?limit=${limit}`);
      if (!resFallback.ok) {
        throw new Error(`Failed to fetch landslides for state ${stateSlug}`);
      }
      return await resFallback.json();
    },
    enabled: isLive && !!stateSlug,
    refetchInterval: 15 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}

