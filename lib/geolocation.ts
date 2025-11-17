/**
 * Geolocation utility for detecting user's country
 * Uses ipapi.co free API for IP-based geolocation
 */

export interface LocationData {
  country_code: string;
  country_name: string;
  error?: string;
}

/**
 * Detects user's location based on IP address
 * Returns country code (e.g., 'NG' for Nigeria, 'US' for United States)
 */
export async function detectUserLocation(): Promise<LocationData> {
  try {
    // Using ipapi.co free API - no API key required
    // Allows 1000 requests per day for free
    const response = await fetch('https://ipapi.co/json/');

    if (!response.ok) {
      throw new Error('Failed to fetch location data');
    }

    const data = await response.json();

    return {
      country_code: data.country_code || 'US',
      country_name: data.country_name || 'United States',
    };
  } catch (error) {
    console.error('Error detecting location:', error);
    // Default to US if detection fails
    return {
      country_code: 'US',
      country_name: 'United States',
      error: 'Failed to detect location',
    };
  }
}

/**
 * Checks if user is in Nigeria
 */
export function isNigeria(countryCode: string): boolean {
  return countryCode.toUpperCase() === 'NG';
}
