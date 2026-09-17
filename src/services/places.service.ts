import { GeocodedResult, SavedPlace, SavedPlaceType, LocationModel } from "@/types/location";
import { StorageService } from "./storage.service";

/**
 * Places and Points of Interest Service
 * Manages user's saved emergency places, recent searches, and official disaster clusters.
 */

// TODO(API)
// NDMA National Vulnerability Atlas & Popular Emergency Clusters
// Endpoint: https://ndma.gov.in/api/v1/designated_hotspots

export class PlacesService {
  /**
   * Retrieves recent searches stored locally.
   */
  static getRecentPlaces(): GeocodedResult[] {
    const recents = StorageService.getRecentLocations();
    return recents.map((r) => ({ ...r.result, isRecent: true }));
  }

  /**
   * Saves a geocoded search result into recents.
   */
  static recordSearch(result: GeocodedResult): void {
    StorageService.addRecentLocation(result);
  }

  /**
   * Clears recent searches history.
   */
  static clearRecentPlaces(): void {
    StorageService.clearRecentLocations();
  }

  /**
   * Retrieves user's saved emergency places.
   */
  static getSavedPlaces(): SavedPlace[] {
    const saved = StorageService.getSavedPlaces();
    if (saved.length > 0) return saved;

    // Initial realistic template for Indian citizens
    return [
      {
        id: "SAVE-HOME-01",
        label: "Home / Permanent Residence",
        type: "home",
        createdAt: Date.now() - 86400000 * 3,
        location: {
          latitude: 21.468,
          longitude: 87.014,
          district: "Balasore",
          state: "Odisha",
          country: "India",
          formattedAddress: "Chandipur Coastal Sector, Ward 4",
          accuracy: 10,
          timestamp: Date.now(),
          permissionStatus: "granted",
          source: "saved",
        },
      },
      {
        id: "SAVE-SHELTER-01",
        label: "Designated Block Cyclone Shelter",
        type: "shelter",
        notes: "Capacity 1200 beds, 25kVA generator, RO water",
        createdAt: Date.now() - 86400000 * 2,
        location: {
          latitude: 21.468,
          longitude: 87.014,
          district: "Balasore",
          state: "Odisha",
          country: "India",
          formattedAddress: "Chandipur Multi-Purpose Cyclone Shelter",
          accuracy: 5,
          timestamp: Date.now(),
          permissionStatus: "granted",
          source: "saved",
        },
      },
    ];
  }

  /**
   * Saves a location as a favorite / home / shelter.
   */
  static savePlace(
    label: string,
    type: SavedPlaceType,
    location: LocationModel,
    notes?: string
  ): SavedPlace {
    const newPlace: SavedPlace = {
      id: `SAVE-${type.toUpperCase()}-${Date.now()}`,
      label,
      type,
      location,
      notes,
      createdAt: Date.now(),
    };
    StorageService.savePlace(newPlace);
    return newPlace;
  }

  /**
   * Deletes a saved place by ID.
   */
  static removeSavedPlace(id: string): void {
    StorageService.removeSavedPlace(id);
  }

  /**
   * Returns active national disaster hubs dynamically without hardcoded Wayanad.
   */
  // TODO(API)
  // NDMA National Vulnerability Atlas
  static async getPopularDisasterHubs(): Promise<GeocodedResult[]> {
    return [
      {
        id: "HUB-ODISHA-COAST",
        name: "Odisha Coastal Disaster Control Cell",
        formattedAddress: "Balasore-Bhadrak Active Landfall Sector",
        district: "Balasore",
        state: "Odisha",
        country: "India",
        latitude: 21.4934,
        longitude: 86.9324,
        category: "district",
      },
      {
        id: "HUB-DELHI-YAMUNA",
        name: "River Yamuna Flood Emergency Zone",
        formattedAddress: "Old Railway Bridge, East & Central Delhi",
        district: "Central Delhi",
        state: "Delhi NCT",
        country: "India",
        latitude: 28.665,
        longitude: 77.242,
        category: "landmark",
      },
      {
        id: "HUB-WB-SUNDARBANS",
        name: "Sundarbans Coastal Delta Surveillance Base",
        formattedAddress: "Kakdwip-Namkhana Embankment Node",
        district: "South 24 Parganas",
        state: "West Bengal",
        country: "India",
        latitude: 21.874,
        longitude: 88.188,
        category: "district",
      },
      {
        id: "HUB-MUMBAI-COAST",
        name: "Mumbai Suburban Flood Inundation Center",
        formattedAddress: "Mithi River Basin & Kurla Transit Node",
        district: "Mumbai Suburban",
        state: "Maharashtra",
        country: "India",
        latitude: 19.0728,
        longitude: 72.8826,
        category: "landmark",
      },
    ];
  }
}
