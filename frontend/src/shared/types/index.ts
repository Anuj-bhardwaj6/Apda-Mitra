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
  hourly: {
    time: string;
    temp: number;
    icon: string;
    rainProb: number;
  }[];
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
