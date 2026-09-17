import { LocationModel, GeocodedResult, SavedPlace, RecentLocationItem } from "@/types/location";

const KEY_LAST_LOCATION = "apda_last_known_location";
const KEY_RECENT_LOCATIONS = "apda_recent_locations";
const KEY_SAVED_PLACES = "apda_saved_places";
const MAX_RECENTS = 20;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export class StorageService {
  // --- Last Known Location ---
  static getLastKnownLocation(): LocationModel | null {
    if (!isBrowser()) return null;
    try {
      const data = localStorage.getItem(KEY_LAST_LOCATION);
      return data && data.trim() ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static saveLastKnownLocation(loc: LocationModel): void {
    if (!isBrowser()) return;
    try {
      localStorage.setItem(KEY_LAST_LOCATION, JSON.stringify(loc));
    } catch (e) {
      console.warn("[StorageService] Could not persist location", e);
    }
  }

  // --- Recent Searches ---
  static getRecentLocations(): RecentLocationItem[] {
    if (!isBrowser()) return [];
    try {
      const data = localStorage.getItem(KEY_RECENT_LOCATIONS);
      const items: RecentLocationItem[] = data && data.trim() ? JSON.parse(data) : [];
      // Sort by usedCount descending, then lastUsedAt descending
      return items.sort((a, b) => b.usedCount - a.usedCount || b.lastUsedAt - a.lastUsedAt);
    } catch {
      return [];
    }
  }


  static addRecentLocation(result: GeocodedResult): void {
    if (!isBrowser()) return;
    try {
      const recents = this.getRecentLocations();
      const existingIdx = recents.findIndex((r) => r.result.id === result.id || (r.result.latitude === result.latitude && r.result.longitude === result.longitude));

      if (existingIdx >= 0) {
        recents[existingIdx].usedCount += 1;
        recents[existingIdx].lastUsedAt = Date.now();
        recents[existingIdx].result = result;
      } else {
        recents.unshift({
          id: result.id,
          result,
          usedCount: 1,
          lastUsedAt: Date.now(),
        });
      }

      const trimmed = recents.slice(0, MAX_RECENTS);
      localStorage.setItem(KEY_RECENT_LOCATIONS, JSON.stringify(trimmed));
    } catch (e) {
      console.warn("[StorageService] Could not save recent location", e);
    }
  }

  static clearRecentLocations(): void {
    if (!isBrowser()) return;
    try {
      localStorage.removeItem(KEY_RECENT_LOCATIONS);
    } catch (e) {
      console.warn("[StorageService] Could not clear recents", e);
    }
  }

  // --- Saved Places ---
  static getSavedPlaces(): SavedPlace[] {
    if (!isBrowser()) return [];
    try {
      const data = localStorage.getItem(KEY_SAVED_PLACES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static savePlace(place: SavedPlace): void {
    if (!isBrowser()) return;
    try {
      const places = this.getSavedPlaces();
      const filtered = places.filter((p) => p.id !== place.id);
      filtered.unshift(place);
      localStorage.setItem(KEY_SAVED_PLACES, JSON.stringify(filtered));
    } catch (e) {
      console.warn("[StorageService] Could not save place", e);
    }
  }

  static removeSavedPlace(id: string): void {
    if (!isBrowser()) return;
    try {
      const places = this.getSavedPlaces().filter((p) => p.id !== id);
      localStorage.setItem(KEY_SAVED_PLACES, JSON.stringify(places));
    } catch (e) {
      console.warn("[StorageService] Could not remove place", e);
    }
  }
}
