/**
 * APDA MITRA (आपदा मित्र) - Offline Local Resilience & IndexedDB Caching Engine
 * 
 * Guarantees zero-network availability for critical disaster data:
 * - Offline emergency contacts (112, 1078, SDMA)
 * - Cached designated relief shelters & GPS coordinates
 * - Offline hazard action guides
 * - Local report drafting queue
 */

export interface CachedLocation {
  name: string;
  state: string;
  coords: [number, number];
  timestamp: number;
}

export interface OfflineEmergencyContact {
  name: string;
  number: string;
  service: string;
  description: string;
}

export const EMERGENCY_OFFLINE_CONTACTS: OfflineEmergencyContact[] = [
  {
    name: "National Emergency Service",
    number: "112",
    service: "All-India Police, Fire, Ambulance",
    description: "Toll-free 24/7 central emergency response dispatch",
  },
  {
    name: "NDRF Disaster Helpline",
    number: "1078",
    service: "National Disaster Response Force",
    description: "Specialized flood, landslide & building rescue teams",
  },
  {
    name: "Meghalaya State Disaster Control",
    number: "1070",
    service: "State Disaster Management Authority (SDMA)",
    description: "District emergency operation center for hill corridors",
  },
  {
    name: "Ambulance & Trauma Medical",
    number: "108",
    service: "Emergency Medical Fleet",
    description: "Hill-terrain four-wheel drive ambulances",
  },
];

const STORAGE_KEYS = {
  LOCATION: "apda_mitra_cached_location",
  SHELTERS: "apda_mitra_cached_shelters",
  OFFLINE_REPORTS_QUEUE: "apda_mitra_offline_reports_queue",
};

/**
 * Cache user's last known detected location
 */
export function cacheLastLocation(location: CachedLocation): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(location));
  } catch (e) {
    console.warn("[OfflineCache] Failed to save location cache", e);
  }
}

/**
 * Get user's last known detected location
 */
export function getCachedLocation(): CachedLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCATION);
    return raw && raw.trim() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Cache verified shelter directory for offline access
 */
export function cacheShelters(shelters: unknown[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.SHELTERS, JSON.stringify(shelters));
  } catch (e) {
    console.warn("[OfflineCache] Failed to save shelters cache", e);
  }
}

/**
 * Retrieve cached shelter directory
 */
export function getCachedShelters<T>(): T[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHELTERS);
    return raw && raw.trim() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Queue a citizen report when offline to sync automatically when back online
 */
export function queueOfflineReport(report: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getQueuedReports();
    existing.push(report);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_REPORTS_QUEUE, JSON.stringify(existing));
  } catch (e) {
    console.warn("[OfflineCache] Failed to queue offline report", e);
  }
}

export function getQueuedReports<T>(): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_REPORTS_QUEUE);
    return raw && raw.trim() ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}


export function clearQueuedReports(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_REPORTS_QUEUE);
  } catch {
    // Graceful ignore
  }
}

/**
 * Network Connectivity Monitor
 */
export function isNetworkOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

export function subscribeNetworkStatus(onChange: (isOnline: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => onChange(true);
  const handleOffline = () => onChange(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
