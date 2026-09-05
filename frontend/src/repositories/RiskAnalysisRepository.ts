import { 
  fetchApi, 
  DisasterRiskAnalysisResponse, 
  HistoricalWeatherSummary, 
  EnsembleForecastSummary 
} from '@/lib/api';

export class RiskAnalysisRepository {
  /**
   * Fetch comprehensive explainable disaster risk score and contributing factor breakdown.
   */
  static async getDisasterRiskAnalysis(
    lat: number, 
    lon: number, 
    locationName: string = 'Current Sector'
  ): Promise<DisasterRiskAnalysisResponse> {
    return await fetchApi<DisasterRiskAnalysisResponse>(
      `/hazard/risk-analysis?latitude=${lat}&longitude=${lon}&location_name=${encodeURIComponent(locationName)}`
    );
  }

  /**
   * Fetch historical daily rainfall and temperature trends with ML training features.
   */
  static async getHistoricalWeather(
    lat: number, 
    lon: number, 
    lookbackDays: number = 14, 
    locationName: string = 'Current Sector'
  ): Promise<HistoricalWeatherSummary> {
    return await fetchApi<HistoricalWeatherSummary>(
      `/weather/historical?latitude=${lat}&longitude=${lon}&lookback_days=${lookbackDays}&location_name=${encodeURIComponent(locationName)}`
    );
  }

  /**
   * Fetch multi-member ensemble forecast and model spread.
   */
  static async getEnsembleForecast(
    lat: number, 
    lon: number, 
    models: string = 'icon_seamless',
    locationName: string = 'Current Sector'
  ): Promise<EnsembleForecastSummary> {
    return await fetchApi<EnsembleForecastSummary>(
      `/weather/ensemble?latitude=${lat}&longitude=${lon}&models=${encodeURIComponent(models)}&location_name=${encodeURIComponent(locationName)}`
    );
  }
}
