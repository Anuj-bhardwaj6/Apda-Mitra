import { LocationModel, LocationPermissionStatus } from "@/types/location";
import { PermissionService } from "./permission.service";

// TODO(API)
// Browser Geolocation API & Geofencing Watch
// Endpoint: navigator.geolocation.getCurrentPosition() & watchPosition()

export interface GeolocationPositionOptionsExtended extends PositionOptions {
  movementThresholdMeters?: number;
}

export class LocationService {
  private static watchId: number | null = null;
  private static lastPosition: { lat: number; lng: number } | null = null;

  /**
   * Calculates Haversine distance between two coordinates in meters.
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Request permission and retrieve immediate current GPS fix.
   */
  static async getCurrentLocation(
    options: PositionOptions = { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
  ): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    heading: number | null;
    speed: number | null;
    timestamp: number;
  }> {
    if (typeof window === "undefined" || !navigator.geolocation) {
      throw new Error("Geolocation is not supported by your device.");
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          reject(error);
        },
        options
      );
    });
  }

  /**
   * Watch location changes while user moves. Emits only when threshold is exceeded to preserve battery.
   */
  static watchLocation(
    onSuccess: (coords: {
      latitude: number;
      longitude: number;
      accuracy: number | null;
      heading: number | null;
      speed: number | null;
      isMoving: boolean;
      timestamp: number;
    }) => void,
    onError: (error: GeolocationPositionError) => void,
    options: GeolocationPositionOptionsExtended = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
      movementThresholdMeters: 10,
    }
  ): number | null {
    if (typeof window === "undefined" || !navigator.geolocation) return null;

    if (this.watchId !== null) {
      this.stopWatching();
    }

    const threshold = options.movementThresholdMeters || 10;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        let isMoving = false;
        if (this.lastPosition) {
          const dist = this.calculateDistance(
            this.lastPosition.lat,
            this.lastPosition.lng,
            lat,
            lng
          );
          if (dist < threshold) {
            // Movement below threshold; skip re-render to conserve battery
            return;
          }
          isMoving = dist > threshold;
        }

        this.lastPosition = { lat, lng };

        onSuccess({
          latitude: lat,
          longitude: lng,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          isMoving,
          timestamp: pos.timestamp,
        });
      },
      onError,
      options
    );

    return this.watchId;
  }

  static stopWatching(): void {
    if (typeof window !== "undefined" && navigator.geolocation && this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.lastPosition = null;
    }
  }

  static async requestPermission(): Promise<LocationPermissionStatus> {
    try {
      await this.getCurrentLocation();
      return "granted";
    } catch (e: any) {
      if (e?.code === 1) return "denied";
      return "prompt";
    }
  }

  static formatAddress(loc: Partial<LocationModel>): string {
    const parts = [
      loc.village || loc.city,
      loc.district,
      loc.state,
      loc.country || "India",
    ].filter(Boolean);
    return parts.join(", ") || "Location in India";
  }
}
