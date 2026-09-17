/**
 * Weather & Atmospheric Spatial Service
 * Supplies weather overlays (precipitation, clouds, wind vectors, temperature) for map rendering.
 */

export interface WeatherOverlayMeta {
  layerType: "precipitation" | "radar" | "wind" | "clouds" | "temperature";
  timestamp: string;
  source: string;
  legendUnits: string;
  minVal: number;
  maxVal: number;
}

// TODO(API)
// OpenMeteo Weather Spatial WMS / Grid Tiles
// Endpoint: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=precipitation,wind_speed_10m,cloud_cover&format=json
export async function fetchOpenMeteoWeatherOverlay(type: WeatherOverlayMeta["layerType"]): Promise<WeatherOverlayMeta> {
  console.info(`[WeatherService] Initializing OpenMeteo overlay feed for: ${type}`);
  return {
    layerType: type,
    timestamp: new Date().toISOString(),
    source: "OpenMeteo & IMD Doppler Integration",
    legendUnits: type === "precipitation" ? "mm/hr" : type === "wind" ? "km/h" : "°C",
    minVal: 0,
    maxVal: type === "wind" ? 140 : 150,
  };
}

// TODO(API)
// IMD Weather Doppler Radar Ingestion
// Endpoint: https://mausam.imd.gov.in/api/dwr_mosaic_tiles/{z}/{x}/{y}.png
export function getImdRadarTileUrl(): string {
  console.info("[WeatherService] Generating IMD Doppler Radar mosaic tile endpoint");
  return "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
}
