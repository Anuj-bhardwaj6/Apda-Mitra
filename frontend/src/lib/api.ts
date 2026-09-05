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
  relative_hour?: number;
  time_iso?: string;
  temp_c: number;
  precip_mm: number;
  humidity: number;
  precip_probability_pct?: number;
  weather_code?: number;
  condition?: string;
}

export interface DailyForecastItem {
  day: number;
  temp_max: number;
  temp_min: number;
  precip_sum: number;
  precip_probability_max?: number;
  weather_code?: number;
  condition?: string;
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
  soil_saturation_status?: string;
  rainfall_alert_tier?: string;
  uv_index?: number;
  weather_code?: number;
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

export interface FloodDailyStep {
  date: string;
  day: number;
  river_discharge_m3s: number;
  river_discharge_mean_m3s: number;
  river_discharge_max_m3s: number;
  river_discharge_min_m3s: number;
}

export interface FloodSummary {
  location_name: string;
  latitude: number;
  longitude: number;
  current_discharge_m3s: number;
  mean_discharge_m3s: number;
  peak_discharge_m3s: number;
  discharge_trend: string;
  flood_risk_level: string;
  alert_tier: string;
  recommendation: string;
  daily_forecast: FloodDailyStep[];
  source: string;
  trust_layer: TrustLayer;
}

export interface AirQualitySummary {
  location_name: string;
  latitude: number;
  longitude: number;
  us_aqi: number;
  european_aqi: number;
  pm2_5: number;
  pm10: number;
  nitrogen_dioxide: number;
  sulphur_dioxide: number;
  ozone: number;
  carbon_monoxide: number;
  aqi_category: string;
  aqi_color: string;
  health_advisory: string;
  source: string;
  trust_layer: TrustLayer;
}

export interface TerrainProfile {
  location_name: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  slope_degrees: number;
  aspect_degrees: number;
  terrain_type: string;
  source: string;
  trust_layer: TrustLayer;
}

export interface HistoricalDayStep {
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  temp_mean_c: number;
  precipitation_mm: number;
  wind_speed_max_kmh: number;
  humidity_mean_pct: number;
}

export interface MLTrainingFeatureVector {
  timestamp: string;
  latitude: number;
  longitude: number;
  precip_7d_sum_mm: number;
  precip_14d_sum_mm: number;
  temp_mean_c: number;
  humidity_mean_pct: number;
  wind_max_kmh: number;
  antecedent_moisture_index: number;
  normalized_features: Record<string, number>;
}

export interface HistoricalWeatherSummary {
  location_name: string;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
  lookback_days: number;
  total_rainfall_mm: number;
  rainfall_anomaly_pct: number;
  mean_temperature_c: number;
  max_wind_speed_kmh: number;
  rainfall_trend: string;
  daily_history: HistoricalDayStep[];
  ml_feature_vector: MLTrainingFeatureVector;
  source: string;
  trust_layer: TrustLayer;
}

export interface EnsembleDailyStep {
  date: string;
  precip_mean_mm: number;
  precip_min_mm: number;
  precip_max_mm: number;
  precip_spread_mm: number;
  temp_mean_c: number;
  temp_min_c: number;
  temp_max_c: number;
  confidence_pct: number;
}

export interface EnsembleForecastSummary {
  location_name: string;
  latitude: number;
  longitude: number;
  member_count: number;
  model_name: string;
  overall_confidence_pct: number;
  uncertainty_level: string;
  mean_precipitation_next_48h_mm: number;
  max_member_precipitation_48h_mm: number;
  exceedance_prob_10mm_pct: number;
  exceedance_prob_25mm_pct: number;
  exceedance_prob_50mm_pct: number;
  daily_forecast: EnsembleDailyStep[];
  source: string;
  trust_layer: TrustLayer;
}

export interface RiskFactorReason {
  category: string;
  title: string;
  title_hi: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score_contribution: number;
  description: string;
  metric_value: string;
}

export interface DisasterRiskAnalysisResponse {
  location_name: string;
  latitude: number;
  longitude: number;
  overall_risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  disclaimer: string;
  headline: string;
  headline_hi: string;
  action_guidance: string;
  reasons: RiskFactorReason[];
  environmental_snapshot: Record<string, any>;
  source: string;
  trust_layer: TrustLayer;
}


