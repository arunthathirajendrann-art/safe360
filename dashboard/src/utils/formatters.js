export function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatTimeAgo(dateString) {
  if (!dateString) return "Recently";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Recently";
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 30) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return dateString;
  }
}

export function formatLocation(location) {
  if (!location) return "GPS Location Unavailable";
  if (typeof location === "string") return location;
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return "GPS Location Unavailable";
  }
  return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
}

export function formatIncidentId(id) {
  if (!id) return "INC-000";
  if (id.length > 8) {
    return `INC-${id.substring(id.length - 6).toUpperCase()}`;
  }
  return id;
}
