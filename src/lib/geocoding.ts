import type { Coordinates } from "./geolocation";
import { isValidCoordinate } from "./geolocation";
import { appOfficialRegion } from "./product";

interface NominatimResult {
  lat: string;
  lon: string;
}

type Fetcher = typeof fetch;

export async function geocodeAddress(
  address: string,
  city = appOfficialRegion.city,
  fetcher: Fetcher = fetch,
): Promise<Coordinates | null> {
  const query = [address.trim(), city.trim(), "Brasil"].filter(Boolean).join(", ");

  if (query.length < 8) {
    return null;
  }

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "br",
    "accept-language": "pt-BR",
  });

  try {
    const response = await fetcher(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "ValeMuito/0.1 (self-hosted; set NOMINATIM_USER_AGENT)",
      },
    });

    if (!response.ok) {
      return null;
    }

    const results = (await response.json()) as NominatimResult[];
    const firstResult = results[0];

    if (!firstResult) {
      return null;
    }

    const coordinates = {
      latitude: Number(firstResult.lat),
      longitude: Number(firstResult.lon),
    };

    return isValidCoordinate(coordinates) ? coordinates : null;
  } catch {
    return null;
  }
}