export interface WeatherData {
  temperatureC: number;
  condition: string;
  conditionHi: string;
  feelsLikeC: number;
  humanPredictionSentence: string;
  humanPredictionSentenceHi: string;
  humidityPct: number;
  windSpeedKmh: number;
  rainfallTodayMm: number;
  uvIndex: number;
  surfacePressureHpa?: number;
  soilMoisturePct?: number;
  soilMoistureSurface?: number;
  soilMoistureRootzone?: number;
  soilSaturationStatus?: string;
  rainfallAlertTier?: string;
  elevationM?: number;
  slopeDegrees?: number;
  terrainType?: string;
  usAqi?: number;
  europeanAqi?: number;
  aqiCategory?: string;
  aqiColor?: string;
  healthAdvisory?: string;
  pm25?: number;
  pm10?: number;
  riverDischargeM3s?: number;
  dischargeTrend?: string;
  floodRiskLevel?: string;
  floodAlertTier?: string;
  isLive?: boolean;
  source?: string;
  latitude?: number;
  longitude?: number;
  updatedAt?: string;
  lastUpdatedTime?: string;
  hourly: {
    time: string;
    temp: number;
    icon: string;
    rainProb: number;
    condition?: string;
  }[];
  daily?: {
    dayLabel: string;
    tempMax: number;
    tempMin: number;
    precipSum: number;
    rainProb: number;
    condition: string;
    icon: string;
  }[];
}

export interface EnvironmentalMetrics {
  elevationM?: number;
  slopeDegrees?: number;
  aspectDegrees?: number;
  terrainType?: string;
  riverDischargeM3s?: number;
  dischargeMeanM3s?: number;
  peakDischargeM3s?: number;
  dischargeTrend?: string;
  floodRiskLevel?: string;
  floodAlertTier?: string;
  floodRecommendation?: string;
  usAqi?: number;
  europeanAqi?: number;
  aqiCategory?: string;
  aqiColor?: string;
  pm25?: number;
  pm10?: number;
  healthAdvisory?: string;
  isLive: boolean;
  source: string;
}


export interface ShelterItem {
  id: string;
  name: string;
  nameHi: string;
  type: 'relief_camp' | 'hospital' | 'police' | 'fire_station';
  distanceKm: number;
  etaMins: number;
  capacity?: number;
  occupancy?: number;
  phone: string;
  isOpen24x7: boolean;
  latitude: number;
  longitude: number;
  address: string;
}

export interface JourneyAssessment {
  origin: string;
  destination: string;
  departureTime: string;
  riskLevel: 'safe' | 'alert' | 'action';
  riskTitle: string;
  riskTitleHi: string;
  summary: string;
  summaryHi: string;
  recommendedRoute: string;
  estimatedDelayMins: number;
  safetyImprovementPct: number;
  waypoints: {
    name: string;
    hazardStatus: 'clear' | 'warning' | 'closed';
  }[];
}

export type UXState = 'loading' | 'loaded' | 'refreshing' | 'offline' | 'error' | 'empty';
