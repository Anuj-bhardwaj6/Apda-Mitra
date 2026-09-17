import { LocationPermissionStatus } from "@/types/location";

export class PermissionService {
  static async queryGeolocationPermission(): Promise<LocationPermissionStatus> {
    if (typeof window === "undefined" || !navigator || !navigator.geolocation) {
      return "unavailable";
    }

    if (!navigator.permissions || !navigator.permissions.query) {
      // Fallback: assume prompt until requested
      return "prompt";
    }

    try {
      const permission = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      return permission.state as LocationPermissionStatus;
    } catch {
      return "prompt";
    }
  }

  static subscribePermissionChange(callback: (status: LocationPermissionStatus) => void): (() => void) | null {
    if (typeof window === "undefined" || !navigator?.permissions?.query) {
      return null;
    }

    let permissionObj: PermissionStatus | null = null;
    const handleChange = () => {
      if (permissionObj) {
        callback(permissionObj.state as LocationPermissionStatus);
      }
    };

    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((perm) => {
        permissionObj = perm;
        perm.addEventListener("change", handleChange);
      })
      .catch(() => {});

    return () => {
      if (permissionObj) {
        permissionObj.removeEventListener("change", handleChange);
      }
    };
  }
}
