// Distance calculation utilities

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance);
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 * @param km Distance in kilometers
 * @returns Formatted string like "~5 km" or "~150 km"
 */
export function formatDistance(km: number): string {
  if (km < 1) return "<1 km";
  if (km < 10) return `~${km} km`;
  // Round to nearest 5 for distances > 10km
  const rounded = Math.round(km / 5) * 5;
  return `~${rounded} km`;
}

/**
 * Get user's location from their profile
 * @returns User's lat/lng or null if not available
 */
export async function getUserLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { supabaseBrowser } = await import("@/lib/supabase");
    const { getCurrentUser } = await import("@/lib/auth");
    
    const user = await getCurrentUser();
    if (!user?.id) return null;
    
    const supabase = supabaseBrowser();
    const { data } = await supabase
      .from("profiles")
      .select("postcode")
      .eq("id", user.id)
      .single();
    
    if (!data?.postcode) return null;
    
    // Geocode the postcode
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(data.postcode)}`);
    if (!response.ok) return null;
    
    const result = await response.json();
    if (result.status === 200 && result.result) {
      return {
        lat: result.result.latitude,
        lng: result.result.longitude,
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user location:", error);
    return null;
  }
}
