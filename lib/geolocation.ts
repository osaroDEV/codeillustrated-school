export interface LocationData {
  country_code: string;
  country_name: string;
  city?: string;
}

export async function detectUserLocation(): Promise<LocationData> {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) {
      throw new Error("Failed to fetch location data");
    }
    const data = await response.json();
    return {
      country_code: data.country_code,
      country_name: data.country_name,
      city: data.city,
    };
  } catch (error) {
    console.error("Geolocation error:", error);
    // Fallback to a default (non-Nigeria)
    return {
      country_code: "US",
      country_name: "United States",
    };
  }
}

export function isNigeria(countryCode: string | undefined): boolean {
  return countryCode === "NG";
}
