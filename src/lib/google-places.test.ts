import { describe, expect, it, vi } from "vitest";
import { getPlaceAutofill, isGooglePlacesConfigured, searchPlaceSuggestions } from "./google-places";

describe("google places", () => {
  it("returns autocomplete suggestions from the Google Places response", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          {
            placePrediction: {
              placeId: "abc123",
              text: { text: "Tigela Norte, Piracicaba - SP, Brasil" },
              structuredFormat: {
                mainText: { text: "Tigela Norte" },
                secondaryText: { text: "Piracicaba - SP, Brasil" },
              },
            },
          },
        ],
      }),
    });

    await expect(searchPlaceSuggestions("tigela", { apiKey: "test-key", fetcher })).resolves.toEqual([
      {
        placeId: "abc123",
        placeName: "Tigela Norte",
        description: "Tigela Norte, Piracicaba - SP, Brasil",
        secondaryText: "Piracicaba - SP, Brasil",
      },
    ]);
  });

  it("extracts address, neighborhood and coordinates from place details", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        formattedAddress: "Rua do Porto, 123 - Piracicaba, SP, Brasil",
        location: {
          latitude: -22.7253,
          longitude: -47.6492,
        },
        addressComponents: [
          {
            longText: "Rua do Porto",
            shortText: "R. do Porto",
            types: ["sublocality_level_1", "sublocality", "political"],
          },
        ],
      }),
    });

    await expect(getPlaceAutofill("abc123", "Tigela Norte", { apiKey: "test-key", fetcher })).resolves.toEqual({
      address: "Rua do Porto, 123 - Piracicaba, SP, Brasil",
      latitude: -22.7253,
      longitude: -47.6492,
      neighborhood: "Rua do Porto",
      placeName: "Tigela Norte",
    });
  });

  it("degrades gracefully when the request fails or no API key exists", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });

    await expect(searchPlaceSuggestions("tigela", { apiKey: "", fetcher })).resolves.toEqual([]);
    await expect(searchPlaceSuggestions("tigela", { apiKey: "test-key", fetcher })).resolves.toEqual([]);
    await expect(getPlaceAutofill("abc123", "Tigela Norte", { apiKey: "test-key", fetcher })).resolves.toBeNull();
    expect(isGooglePlacesConfigured("test-key")).toBe(true);
    expect(isGooglePlacesConfigured("")).toBe(false);
  });

  it("falls back to locality when a specific neighborhood component is missing", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        formattedAddress: "Centro, Piracicaba - SP, Brasil",
        location: {
          latitude: -22.7253,
          longitude: -47.6492,
        },
        addressComponents: [
          {
            longText: "Piracicaba",
            shortText: "Piracicaba",
            types: ["locality", "political"],
          },
        ],
      }),
    });

    await expect(getPlaceAutofill("abc123", "Centro Cafe", { apiKey: "test-key", fetcher })).resolves.toEqual({
      address: "Centro, Piracicaba - SP, Brasil",
      latitude: -22.7253,
      longitude: -47.6492,
      neighborhood: "Piracicaba",
      placeName: "Centro Cafe",
    });
  });

  it("returns empty results when the provider throws", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("timeout"));

    await expect(searchPlaceSuggestions("Cafe Sao Jose", { apiKey: "test-key", fetcher })).resolves.toEqual([]);
    await expect(getPlaceAutofill("abc123", "Cafe Sao Jose", { apiKey: "test-key", fetcher })).resolves.toBeNull();
  });
});