export class OpenMeteoAdapter {
  static async fetchCurrent(lat: number, lon: number) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&forecast_days=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('OpenMeteo HTTP Error');
      return await res.json();
    } catch {
      return null;
    }
  }
}

export class NominatimAdapter {
  static async reverseGeocode(lat: number, lon: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ApdaMitraDisasterPlatform/1.0' },
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const district = data.address?.county || data.address?.state_district || data.address?.city || 'Wayanad';
      const state = data.address?.state || 'Kerala';
      return `${district}, ${state}`;
    } catch {
      return null;
    }
  }
}
