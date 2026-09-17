export interface WeatherData {
  stationName: string;
  state: string;
  temperatureC: number;
  feelsLikeC: number;
  condition: string;
  rainfallPast24hMm: number;
  precipitationProbability: number;
  windSpeedKmh: number;
  windGustKmh: number;
  windDirection: string;
  humidityPercent: number;
  uvIndex: number;
  aqiValue: number;
  aqiCategory: "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe";
  radarStatus: "Operational" | "Maintenance" | "Warning Mode";
  radarStation: string;
  imdWarningColor: "Red" | "Orange" | "Yellow" | "Green";
  hourlyForecast: {
    time: string;
    tempC: number;
    rainProb: number;
    condition: string;
  }[];
}
