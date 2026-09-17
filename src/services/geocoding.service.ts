import { GeocodedResult, LocationModel } from "@/types/location";
import { LocationService } from "./location.service";

/**
 * Geocoding & Spatial Discovery Service
 * Centralizes address resolution, reverse geocoding, and autocomplete across India
 * using OpenStreetMap Nominatim and Komoot Photon with resilient local hub fallback.
 */

const INDIAN_HUBS: GeocodedResult[] = [
  {
    id: "LOC-BALASORE-DIST",
    name: "Balasore District Headquarters",
    formattedAddress: "Station Road, Balasore Town, Odisha",
    district: "Balasore",
    state: "Odisha",
    country: "India",
    postalCode: "756001",
    latitude: 21.4934,
    longitude: 86.9324,
    category: "district",
  },
  {
    id: "LOC-CHANDIPUR-COAST",
    name: "Chandipur Coastal Sector & Cyclone Shelter",
    formattedAddress: "Ward 4, Near Chandipur Beach, Balasore",
    district: "Balasore",
    state: "Odisha",
    country: "India",
    postalCode: "756025",
    latitude: 21.468,
    longitude: 87.014,
    category: "shelter",
  },
  {
    id: "LOC-BHADRAK-DIST",
    name: "Bhadrak District Emergency Cell",
    formattedAddress: "Collectorate Road, Bhadrak",
    district: "Bhadrak",
    state: "Odisha",
    country: "India",
    postalCode: "756100",
    latitude: 21.0574,
    longitude: 86.5165,
    category: "district",
  },
  {
    id: "LOC-CUTTACK-CITY",
    name: "Cuttack Municipal Corporation & Relief Depot",
    formattedAddress: "Bikash Bhavan, Jagatpur, Cuttack",
    district: "Cuttack",
    state: "Odisha",
    country: "India",
    postalCode: "753001",
    latitude: 20.4625,
    longitude: 85.8828,
    category: "city",
  },
  {
    id: "LOC-DELHI-YAMUNA",
    name: "Yamuna Old Railway Bridge Relief Station",
    formattedAddress: "Bela Road, Kashmere Gate Transit Area",
    district: "Central Delhi",
    state: "Delhi NCT",
    country: "India",
    postalCode: "110006",
    latitude: 28.665,
    longitude: 77.242,
    category: "shelter",
  },
  {
    id: "LOC-DELHI-RML",
    name: "Dr. Ram Manohar Lohia Trauma Center",
    formattedAddress: "Baba Kharak Singh Marg, Connaught Place",
    district: "New Delhi",
    state: "Delhi NCT",
    country: "India",
    postalCode: "110001",
    latitude: 28.625,
    longitude: 77.201,
    category: "hospital",
  },
  {
    id: "LOC-KOL-KAKDWIP",
    name: "Kakdwip Coastal Sub-Division Hospital",
    formattedAddress: "Diamond Harbour Road, South 24 Parganas",
    district: "South 24 Parganas",
    state: "West Bengal",
    country: "India",
    postalCode: "743347",
    latitude: 21.874,
    longitude: 88.188,
    category: "hospital",
  },
  {
    id: "LOC-MUM-KURLA",
    name: "Kurla Mithi River Inundation Monitoring Node",
    formattedAddress: "LBS Marg, Kurla West, Mumbai Suburban",
    district: "Mumbai Suburban",
    state: "Maharashtra",
    country: "India",
    postalCode: "400070",
    latitude: 19.0728,
    longitude: 72.8826,
    category: "landmark",
  },
  {
    id: "LOC-WAYANAD-DIS",
    name: "Wayanad District Disaster Cell",
    formattedAddress: "Collectorate, Kalpetta, Wayanad",
    district: "Wayanad",
    state: "Kerala",
    country: "India",
    postalCode: "673121",
    latitude: 11.6103,
    longitude: 76.0827,
    category: "district",
  },
];

// Simple in-memory cache for reverse geocode lookups
const geocodeCache = new Map<string, Partial<LocationModel>>();

export class GeocodingService {
  /**
   * Reverse geocodes [lat, lon] to an administrative LocationModel via OpenStreetMap Nominatim.
   */
  static async reverse(lat: number, lon: number): Promise<Partial<LocationModel>> {
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    if (geocodeCache.has(key)) {
      return geocodeCache.get(key)!;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "ApdaMitraDisasterManagementApp/1.0",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const district =
          addr.state_district ||
          addr.district ||
          addr.county ||
          addr.city ||
          addr.suburb ||
          "Emergency Sector";
        const state = addr.state || "India";
        const country = addr.country || "India";
        const city = addr.city || addr.town || addr.village || district;
        const village = addr.village || addr.suburb || addr.neighbourhood;
        const postalCode = addr.postcode;
        
        // Take first 3 parts of the display name for a clean UI line
        const parts = (data.display_name || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
        const formattedAddress = parts.length >= 2 ? parts.slice(0, 3).join(", ") : `${district}, ${state}`;

        const result: Partial<LocationModel> = {
          district,
          state,
          country,
          city,
          village,
          postalCode,
          formattedAddress,
        };

        geocodeCache.set(key, result);
        return result;
      }
    } catch (e) {
      console.warn("[GeocodingService] Nominatim reverse geocode failed, using local spatial fallback", e);
    }

    // Match nearest known Indian district cluster or calculate realistic fallback
    const matched = INDIAN_HUBS.find(
      (hub) => LocationService.calculateDistance(lat, lon, hub.latitude, hub.longitude) < 35000
    );

    if (matched) {
      const fallbackResult = {
        district: matched.district,
        state: matched.state,
        country: "India",
        city: matched.name,
        postalCode: matched.postalCode,
        formattedAddress: matched.formattedAddress,
      };
      geocodeCache.set(key, fallbackResult);
      return fallbackResult;
    }

    return {
      district: "Coastal Emergency Sector",
      state: "India",
      country: "India",
      city: "National Sector",
      formattedAddress: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`,
    };
  }

  /**
   * Autocomplete location suggestions matching user query via Komoot Photon API.
   */
  static async autocomplete(
    query: string,
    userLocation?: { lat: number; lng: number }
  ): Promise<GeocodedResult[]> {
    const q = query.trim();
    if (!q || q.length < 2) return [];

    try {
      // Photon API search restricted to India coordinates bbox: [68.1, 6.5, 97.4, 35.5]
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&bbox=68.1,6.5,97.4,35.5&limit=8`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });

      if (res.ok) {
        const data = await res.json();
        if (data.features && Array.isArray(data.features) && data.features.length > 0) {
          const liveResults: GeocodedResult[] = data.features.map((feat: any, idx: number) => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates || [0, 0];
            const lon = coords[0];
            const lat = coords[1];

            const name = props.name || props.city || props.district || props.state || q;
            const district = props.district || props.county || props.city || "";
            const state = props.state || "India";
            const postalCode = props.postcode;

            const addrParts = [name, district, state].filter(Boolean);
            const formattedAddress = addrParts.join(", ");

            const item: GeocodedResult = {
              id: `PHOTON-${props.osm_id || idx}-${Date.now()}`,
              name,
              formattedAddress,
              district: district || name,
              state,
              country: props.country || "India",
              postalCode,
              latitude: lat,
              longitude: lon,
              category: props.osm_value === "hospital" ? "hospital" : props.osm_value === "place" ? "city" : "district",
            };

            if (userLocation) {
              item.distanceMeters = LocationService.calculateDistance(
                userLocation.lat,
                userLocation.lng,
                lat,
                lon
              );
            }
            return item;
          });

          if (userLocation) {
            liveResults.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
          }
          return liveResults;
        }
      }
    } catch (e) {
      console.warn("[GeocodingService] Photon autocomplete query failed, falling back to local registry", e);
    }

    // Fallback: search local hub registry
    const lowerQ = q.toLowerCase();
    const results = INDIAN_HUBS.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerQ) ||
        item.district.toLowerCase().includes(lowerQ) ||
        item.state.toLowerCase().includes(lowerQ) ||
        item.formattedAddress.toLowerCase().includes(lowerQ)
    ).map((item) => {
      if (userLocation) {
        const dist = LocationService.calculateDistance(
          userLocation.lat,
          userLocation.lng,
          item.latitude,
          item.longitude
        );
        return { ...item, distanceMeters: dist };
      }
      return item;
    });

    if (userLocation) {
      results.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
    }

    return results;
  }

  /**
   * Full search query returning geocoded results.
   */
  static async search(query: string): Promise<GeocodedResult[]> {
    return this.autocomplete(query);
  }
}
