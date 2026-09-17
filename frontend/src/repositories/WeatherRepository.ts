import { fetchApi, WeatherSummary } from '@/lib/api';
import { WeatherData } from '@/shared/types';
import { DisasterAppMode } from '@/shared/types/disaster';
import { EnvironmentalRepository } from '@/repositories/EnvironmentalRepository';

function buildPrediction(weather: WeatherSummary, mode: DisasterAppMode): string {
  if (mode === 'disaster' || weather.rainfall_24h_mm >= 50) {
    return 'Heavy rainfall risk is elevated through the next forecast window.';
  }

  if (weather.rainfall_24h_mm >= 10) {
    return 'Rain is likely in the next few hours. Keep travel plans flexible.';
  }

  if (weather.humidity_pct > 85) {
    return 'Humid and overcast conditions may persist around this area.';
  }

  return 'Conditions look stable in the short-term forecast.';
}

function iconForHour(precipMm: number, rainProb: number): string {
  if (precipMm >= 8 || rainProb >= 85) return 'heavy-rain';
  if (precipMm > 0 || rainProb >= 45) return 'rain';
  return 'cloud';
}

function formatHour(hour: number, index: number, timeIso?: string): string {
  if (index === 0) return 'Now';
  if (timeIso) {
    try {
      const d = new Date(timeIso);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
      }
    } catch {
      // Fallback to clock calculation
    }
  }
  if (hour !== undefined && hour >= 0 && hour <= 24) {
    const h = hour % 24;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12} ${ampm}`;
  }
  return `+${index}h`;
}

function formatLastUpdated(isoString?: string): string {
  if (!isoString) {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
}

function mapWeatherSummary(
  weather: WeatherSummary, 
  mode: DisasterAppMode, 
  lat: number, 
  lon: number
): WeatherData {
  const hourly = (weather.hourly_forecast || []).slice(0, 12).map((item, idx) => {
    const rainProb = item.precip_probability_pct ?? Math.min(95, Math.round(item.precip_mm * 18));
    return {
      time: formatHour(item.hour, idx, item.time_iso),
      temp: Math.round(item.temp_c),
      icon: iconForHour(item.precip_mm, rainProb),
      rainProb,
      condition: item.condition,
    };
  });

  const dayNames = ['Today', 'Tomorrow', 'Day 3'];
  const daily = (weather.daily_forecast || []).map((d, i) => {
    const prob = d.precip_probability_max ?? Math.min(95, Math.round(d.precip_sum * 12));
    return {
      dayLabel: dayNames[i] || `Day ${i + 1}`,
      tempMax: Math.round(d.temp_max),
      tempMin: Math.round(d.temp_min),
      precipSum: Math.round(d.precip_sum * 10) / 10,
      rainProb: prob,
      condition: d.condition || 'Variable Clouds',
      icon: iconForHour(d.precip_sum, prob),
    };
  });

  const temp = Math.round(weather.temperature_c);
  const prediction = buildPrediction(weather, mode);

  return {
    temperatureC: temp,
    condition: weather.weather_condition,
    conditionHi: weather.weather_condition,
    feelsLikeC: Math.round(weather.feels_like_c ?? weather.temperature_c),
    humanPredictionSentence: prediction,
    humanPredictionSentenceHi: prediction,
    humidityPct: weather.humidity_pct,
    windSpeedKmh: Math.round(weather.wind_speed_kmh),
    rainfallTodayMm: weather.rainfall_24h_mm,
    uvIndex: Math.round(weather.uv_index ?? 0),
    surfacePressureHpa: Math.round(weather.surface_pressure_hpa),
    soilMoisturePct: Math.round(weather.soil_moisture_pct),
    soilMoistureSurface: weather.soil_moisture_surface,
    soilMoistureRootzone: weather.soil_moisture_rootzone,
    soilSaturationStatus: weather.soil_saturation_status || (weather.soil_moisture_pct > 70 ? 'Critical' : 'Normal'),
    rainfallAlertTier: weather.rainfall_alert_tier || 'Normal / Light',
    isLive: true,
    source: weather.source || 'Open-Meteo Multi-API',
    latitude: lat,
    longitude: lon,
    updatedAt: weather.trust_layer?.updatedAt || new Date().toISOString(),
    lastUpdatedTime: formatLastUpdated(weather.trust_layer?.updatedAt),
    hourly: hourly.length > 0
      ? hourly
      : [{ time: 'Now', temp: temp, icon: 'cloud', rainProb: 0 }],
    daily: daily.length > 0 ? daily : undefined,
  };
}

export class WeatherRepository {
  /**
   * Fetches real-time weather and environmental telemetry from live Open-Meteo APIs.
   * Throws on network/API failure so callers render a genuine error state rather than fake values.
   */
  static async getWeather(lat: number, lon: number, mode: DisasterAppMode): Promise<WeatherData> {
    const [weatherRes, env] = await Promise.all([
      fetchApi<WeatherSummary>(`/weather/forecast?latitude=${lat}&longitude=${lon}`),
      EnvironmentalRepository.getCombinedEnvironmental(lat, lon).catch(() => null),
    ]);
    const mapped = mapWeatherSummary(weatherRes, mode, lat, lon);
    if (env) {
      mapped.elevationM = env.elevationM;
      mapped.slopeDegrees = env.slopeDegrees;
      mapped.terrainType = env.terrainType;
      mapped.usAqi = env.usAqi;
      mapped.europeanAqi = env.europeanAqi;
      mapped.aqiCategory = env.aqiCategory;
      mapped.aqiColor = env.aqiColor;
      mapped.healthAdvisory = env.healthAdvisory;
      mapped.pm25 = env.pm25;
      mapped.pm10 = env.pm10;
      mapped.riverDischargeM3s = env.riverDischargeM3s;
      mapped.dischargeTrend = env.dischargeTrend;
      mapped.floodRiskLevel = env.floodRiskLevel;
      mapped.floodAlertTier = env.floodAlertTier;
    }
    return mapped;
  }
}