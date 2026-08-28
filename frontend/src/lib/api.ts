const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.warn(`Fetch API warning for ${endpoint}:`, error);
    throw error;
  }
}

// Data Models & Interfaces

export interface TrustLayer {
  source: string;
  updatedAt: string;
  confidence: number;
  dataFreshness: string;
}

export interface TimelineStep {
  step: string;
  label: string;
  risk_level: string;
  risk_score: number;
  rainfall_mm: number;
  soil_moisture_pct: number;
}

export interface HistoricalLandslide {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  district: string;
  state: string;
  date: string;
  severity: string;
  trigger: string;
  distance_km: number;
  landslide_type?: string;
}

export interface HazardEvaluation {
  hazard_type: string;
  location_name: string;
  latitude: number;
  longitude: number;
  elevation_m?: number;
  slope_degrees?: number;
  risk_score: number;
  risk_level: string;
  confidence: number;
  xai_reasons: string[];
  recommendations: string[];
  timeline: TimelineStep[];
  historical_incidents?: HistoricalLandslide[];
  trust_layer: TrustLayer;
}

export interface HourlyForecastItem {
  hour: number;
  temp_c: number;
  precip_mm: number;
  humidity: number;
}

export interface DailyForecastItem {
  day: number;
  temp_max: number;
  temp_min: number;
  precip_sum: number;
}

export interface WeatherSummary {
  location_name: string;
  temperature_c: number;
  feels_like_c?: number;
  humidity_pct: number;
  rainfall_24h_mm: number;
  rainfall_72h_mm: number;
  rainfall_weekly_mm?: number;
  wind_speed_kmh: number;
  wind_direction_deg?: number;
  surface_pressure_hpa: number;
  soil_moisture_pct: number;
  soil_moisture_surface?: number;
  soil_moisture_rootzone?: number;
  uv_index?: number;
  weather_condition: string;
  hourly_forecast?: HourlyForecastItem[];
  daily_forecast?: DailyForecastItem[];
  source?: string;
  trust_layer: TrustLayer;
}

export interface SavedPlace {
  id: number;
  user_id?: number;
  name: string;
  place_type: string;
  address?: string;
  latitude: number;
  longitude: number;
  last_risk_level: string;
  last_risk_score: number;
  updated_at: string;
}

export interface CitizenReport {
  id: number;
  reporter_name: string;
  category: string;
  description?: string;
  latitude: number;
  longitude: number;
  location_name?: string;
  photo_url?: string;
  status: string;
  created_at: string;
}

export interface EmergencyContact {
  id: number;
  service_name: string;
  category: string;
  phone: string;
  description?: string;
  sort_order: number;
}

export interface ShelterResource {
  id: number;
  name: string;
  facility_type: string;
  amenity?: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_occupancy: number;
  contact_phone?: string;
  distance_km?: number;
  is_operational?: boolean;
}

export interface EOCMetrics {
  active_red_alerts: number;
  active_amber_watches: number;
  total_citizen_reports: number;
  pending_verification: number;
  verified_reports: number;
  operational_shelters: number;
  total_shelter_capacity: number;
  current_evacuees: number;
  ndrf_teams_deployed: number;
  earthmovers_standby: number;
  active_alerts_list: any[];
  trust_layer: TrustLayer;
}

export interface RouteGeometry {
  type: string;
  coordinates: [number, number][]; // [lon, lat] pairs
}

export interface RouteStep {
  instruction: string;
  distance_meters: number;
  duration_sec: number;
}

export interface RouteDirections {
  distance_km: number;
  duration_minutes: number;
  mode: string;
  geometry: RouteGeometry;
  steps: RouteStep[];
  source: string;
}

export interface ImageAnalysisResult {
  category: string;
  severity: string;
  confidence: number;
  description: string;
  action_advice: string;
  source: string;
}

export interface StructuredLocation {
  formatted_name: string;
  village: string;
  taluk: string;
  district: string;
  state: string;
  country: string;
  postcode?: string;
  latitude: number;
  longitude: number;
  source: string;
}
