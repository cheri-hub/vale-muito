import { isValidCoordinate } from "./geolocation";
import { appOfficialRegion } from "./product";

interface PlacesClientOptions {
  apiKey?: string;
  fetcher?: typeof fetch;
}

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: {
        text?: string;
      };
      structuredFormat?: {
        mainText?: {
          text?: string;
        };
        secondaryText?: {
          text?: string;
        };
      };
    };
  }>;
}

interface PlaceDetailsResponse {
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
}

export interface PlaceSuggestion {
  placeId: string;
  placeName: string;
  description: string;
  secondaryText: string;
}

export interface PlaceAutofill {
  address: string;
  latitude: number;
  longitude: number;
  neighborhood: string;
  placeName: string;
}

const GOOGLE_PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const GOOGLE_PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";
const GOOGLE_PLACES_AUTOCOMPLETE_FIELD_MASK = [
  "suggestions.placePrediction.placeId",
  "suggestions.placePrediction.text.text",
  "suggestions.placePrediction.structuredFormat.mainText.text",
  "suggestions.placePrediction.structuredFormat.secondaryText.text",
].join(",");
const GOOGLE_PLACES_DETAILS_FIELD_MASK = ["formattedAddress", "location", "addressComponents"].join(",");
const GOOGLE_PLACES_REQUEST_TIMEOUT_MS = 5_000;

export function isGooglePlacesConfigured(apiKey = getGooglePlacesApiKey()): boolean {
  return Boolean(apiKey);
}

export async function searchPlaceSuggestions(
  input: string,
  options: PlacesClientOptions = {},
): Promise<PlaceSuggestion[]> {
  const query = input.trim();
  const apiKey = options.apiKey ?? getGooglePlacesApiKey();

  if (query.length < 3 || !apiKey) {
    return [];
  }

  try {
    const response = await fetchGooglePlaces(GOOGLE_PLACES_AUTOCOMPLETE_URL, {
      fetcher: options.fetcher,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": GOOGLE_PLACES_AUTOCOMPLETE_FIELD_MASK,
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: ["br"],
        languageCode: "pt-BR",
        locationBias: {
          circle: {
            center: appOfficialRegion.coordinates,
            radius: 30_000,
          },
        },
        regionCode: "br",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as AutocompleteResponse;

    return (payload.suggestions ?? [])
      .map((suggestion) => suggestion.placePrediction)
      .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction?.placeId))
      .map((prediction) => ({
        placeId: prediction.placeId ?? "",
        placeName: prediction.structuredFormat?.mainText?.text?.trim() || prediction.text?.text?.trim() || "",
        description: prediction.text?.text?.trim() || "",
        secondaryText: prediction.structuredFormat?.secondaryText?.text?.trim() || "",
      }))
      .filter((prediction) => prediction.placeId && prediction.placeName && prediction.description)
      .slice(0, 5);
  } catch (error: unknown) {
    logGooglePlacesError("autocomplete", error);
    return [];
  }
}

export async function getPlaceAutofill(
  placeId: string,
  fallbackPlaceName: string,
  options: PlacesClientOptions = {},
): Promise<PlaceAutofill | null> {
  const normalizedPlaceId = placeId.trim();
  const normalizedFallbackName = fallbackPlaceName.trim();
  const apiKey = options.apiKey ?? getGooglePlacesApiKey();

  if (!normalizedPlaceId || !normalizedFallbackName || !apiKey) {
    return null;
  }

  try {
    const response = await fetchGooglePlaces(
      `${GOOGLE_PLACES_DETAILS_URL}/${encodeURIComponent(normalizedPlaceId)}?languageCode=pt-BR&regionCode=BR`,
      {
        fetcher: options.fetcher,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": GOOGLE_PLACES_DETAILS_FIELD_MASK,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as PlaceDetailsResponse;
    const coordinates = {
      latitude: Number(payload.location?.latitude),
      longitude: Number(payload.location?.longitude),
    };

    if (!payload.formattedAddress || !isValidCoordinate(coordinates)) {
      return null;
    }

    return {
      address: payload.formattedAddress.trim(),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      neighborhood: extractNeighborhood(payload.addressComponents),
      placeName: normalizedFallbackName,
    };
  } catch (error: unknown) {
    logGooglePlacesError("details", error);
    return null;
  }
}

function extractNeighborhood(
  components: PlaceDetailsResponse["addressComponents"],
): string {
  if (!components?.length) {
    return "";
  }

  const preferredTypes = [
    "sublocality_level_1",
    "sublocality",
    "neighborhood",
    "administrative_area_level_2",
    "locality",
  ];

  for (const type of preferredTypes) {
    const component = components.find((item) => item.types?.includes(type));

    if (component?.longText?.trim()) {
      return component.longText.trim();
    }
  }

  return "";
}

function getGooglePlacesApiKey(): string {
  return process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? "";
}

async function fetchGooglePlaces(
  input: string,
  init: RequestInit & { fetcher?: typeof fetch },
): Promise<Response> {
  const { fetcher, ...requestInit } = init;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GOOGLE_PLACES_REQUEST_TIMEOUT_MS);

  try {
    return await (fetcher ?? fetch)(input, {
      ...requestInit,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function logGooglePlacesError(scope: "autocomplete" | "details", error: unknown) {
  const message = error instanceof Error ? error.message : "unknown error";

  console.error(`[Google Places] ${scope} failed: ${message}`);
}