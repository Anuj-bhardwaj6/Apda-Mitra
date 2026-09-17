export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return "Recently";
  }
}

export function formatCoordinates(lat: number, lng: number): string {
  const latCard = lat >= 0 ? "N" : "S";
  const lngCard = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latCard}, ${Math.abs(lng).toFixed(4)}° ${lngCard}`;
}
