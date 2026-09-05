import { fetchApi, FloodSummary, AirQualitySummary, TerrainProfile } from '@/lib/api';
import { EnvironmentalMetrics } from '@/shared/types';

export class EnvironmentalRepository {
  /**
   * Fetch 3-day river discharge forecast from Open-Meteo Flood API via backend.
   */
  static async getFloodForecast(lat: number, lon: number, locationName: string = 'Local Basin'): Promise<FloodSummary> {
    return await fetchApi<FloodSummary>(
      `/flood/forecast?latitude=${lat}&longitude=${lon}&location_name=${encodeURIComponent(locationName)}`
    );
  }

  /**
   * Fetch live air quality and particulate pollutants from Open-Meteo Air Quality API via backend.
   */
  static async getAirQuality(lat: number, lon: number, locationName: string = 'Current Area'): Promise<AirQualitySummary> {
    return await fetchApi<AirQualitySummary>(
      `/air-quality/current?latitude=${lat}&longitude=${lon}&location_name=${encodeURIComponent(locationName)}`
    );
  }

  /**
   * Fetch topographical elevation, slope angle, and terrain risk from Open-Meteo Elevation API via backend.
   */
  static async getTerrainProfile(lat: number, lon: number, locationName: string = 'Local Terrain'): Promise<TerrainProfile> {
    return await fetchApi<TerrainProfile>(
      `/elevation/profile?latitude=${lat}&longitude=${lon}&location_name=${encodeURIComponent(locationName)}`
    );
  }

  /**
   * Concurrently fetch all three environmental APIs with graceful fault tolerance.
   * Does NOT invent fake numbers if a stream is unreachable.
   */
  static async getCombinedEnvironmental(lat: number, lon: number, locationName: string = 'Current Location'): Promise<EnvironmentalMetrics> {
    const [floodRes, aqiRes, terrainRes] = await Promise.allSettled([
      this.getFloodForecast(lat, lon, locationName),
      this.getAirQuality(lat, lon, locationName),
      this.getTerrainProfile(lat, lon, locationName)
    ]);

    const flood = floodRes.status === 'fulfilled' ? floodRes.value : null;
    const aqi = aqiRes.status === 'fulfilled' ? aqiRes.value : null;
    const terrain = terrainRes.status === 'fulfilled' ? terrainRes.value : null;

    return {
      elevationM: terrain ? Math.round(terrain.elevation_m) : undefined,
      slopeDegrees: terrain ? Math.round(terrain.slope_degrees * 10) / 10 : undefined,
      aspectDegrees: terrain ? Math.round(terrain.aspect_degrees) : undefined,
      terrainType: terrain?.terrain_type,
      riverDischargeM3s: flood ? Math.round(flood.current_discharge_m3s * 10) / 10 : undefined,
      dischargeMeanM3s: flood ? Math.round(flood.mean_discharge_m3s * 10) / 10 : undefined,
      peakDischargeM3s: flood ? Math.round(flood.peak_discharge_m3s * 10) / 10 : undefined,
      dischargeTrend: flood?.discharge_trend,
      floodRiskLevel: flood?.flood_risk_level,
      floodAlertTier: flood?.alert_tier,
      floodRecommendation: flood?.recommendation,
      usAqi: aqi?.us_aqi,
      europeanAqi: aqi?.european_aqi,
      aqiCategory: aqi?.aqi_category,
      aqiColor: aqi?.aqi_color,
      pm25: aqi ? Math.round(aqi.pm2_5 * 10) / 10 : undefined,
      pm10: aqi ? Math.round(aqi.pm10 * 10) / 10 : undefined,
      healthAdvisory: aqi?.health_advisory,
      isLive: Boolean(flood || aqi || terrain),
      source: 'Open-Meteo Flood, Air Quality & Elevation'
    };
  }
}
