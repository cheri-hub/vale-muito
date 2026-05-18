import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaceAutofill, PlaceSuggestion } from "@/lib/google-places";

const {
  headersMock,
  checkRateLimitMock,
  getRecommendationRepositoryMock,
  getCurrentUserMock,
  getOfflineDemoUserMock,
  isGooglePlacesConfiguredMock,
  searchPlaceSuggestionsMock,
  getPlaceAutofillMock,
} = vi.hoisted(() => ({
  headersMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getRecommendationRepositoryMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  getOfflineDemoUserMock: vi.fn((role: "member" | "admin" = "member") => ({
    id: `offline-${role}`,
    name: role === "admin" ? "Admin Demo" : "Usuario Demo",
    handle: role === "admin" ? "@admin-demo" : "@demo",
    role,
  })),
  isGooglePlacesConfiguredMock: vi.fn(),
  searchPlaceSuggestionsMock: vi.fn(),
  getPlaceAutofillMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/rate-limit-client", () => ({
  getRateLimitClientKey: vi.fn(() => "test-client"),
}));

vi.mock("@/repositories/recommendations", () => ({
  getRecommendationRepository: getRecommendationRepositoryMock,
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: getCurrentUserMock,
  getOfflineDemoUser: getOfflineDemoUserMock,
}));

vi.mock("@/lib/google-places", async () => {
  const actual = await vi.importActual<typeof import("@/lib/google-places")>("@/lib/google-places");

  return {
    ...actual,
    isGooglePlacesConfigured: isGooglePlacesConfiguredMock,
    searchPlaceSuggestions: searchPlaceSuggestionsMock,
    getPlaceAutofill: getPlaceAutofillMock,
  };
});

import { autofillRecommendationPlaceAction, searchRecommendationPlaceSuggestionsAction } from "./actions";

describe("recommendation place actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    headersMock.mockResolvedValue(new Headers());
    checkRateLimitMock.mockResolvedValue(true);
    getRecommendationRepositoryMock.mockResolvedValue({
      data: {},
      mode: "supabase",
    });
    getCurrentUserMock.mockResolvedValue({
      profile: {
        id: "user-1",
        name: "Luis",
        handle: "@luis",
        role: "member",
      },
      mode: "supabase",
    });
    isGooglePlacesConfiguredMock.mockReturnValue(true);
    searchPlaceSuggestionsMock.mockResolvedValue([]);
    getPlaceAutofillMock.mockResolvedValue(null);
  });

  it("blocks place search when rate limited", async () => {
    checkRateLimitMock.mockResolvedValue(false);

    await expect(searchRecommendationPlaceSuggestionsAction("Tigela Norte")).resolves.toEqual({
      ok: false,
      message: "Muitas buscas de lugar em pouco tempo. Tente novamente em instantes.",
      mode: "offline",
    });
    expect(searchPlaceSuggestionsMock).not.toHaveBeenCalled();
  });

  it("blocks anonymous place search when rate limited", async () => {
    getCurrentUserMock.mockResolvedValue({ profile: null, mode: "supabase" });
    checkRateLimitMock.mockResolvedValue(false);

    await expect(searchRecommendationPlaceSuggestionsAction("Babbo Pizzaria")).resolves.toEqual({
      ok: false,
      message: "Muitas buscas de lugar em pouco tempo. Tente novamente em instantes.",
      mode: "offline",
    });
    expect(searchPlaceSuggestionsMock).not.toHaveBeenCalled();
  });

  it("allows anonymous place search in supabase mode", async () => {
    getCurrentUserMock.mockResolvedValue({ profile: null, mode: "supabase" });
    searchPlaceSuggestionsMock.mockResolvedValue([
      {
        placeId: "anon-123",
        placeName: "Babbo Pizzaria",
        description: "Babbo Pizzaria, Piracicaba - SP, Brasil",
        secondaryText: "Piracicaba - SP, Brasil",
      },
    ]);

    await expect(searchRecommendationPlaceSuggestionsAction("Tigela Norte")).resolves.toEqual({
      ok: true,
      data: [
        {
          placeId: "anon-123",
          placeName: "Babbo Pizzaria",
          description: "Babbo Pizzaria, Piracicaba - SP, Brasil",
          secondaryText: "Piracicaba - SP, Brasil",
        },
      ],
      message: "Lugar encontrado.",
      mode: "supabase",
    });
    expect(searchPlaceSuggestionsMock).toHaveBeenCalledWith("Tigela Norte");
  });

  it("validates configuration and query before searching places", async () => {
    isGooglePlacesConfiguredMock.mockReturnValue(false);

    await expect(searchRecommendationPlaceSuggestionsAction("Tigela Norte")).resolves.toEqual({
      ok: false,
      message: "Autocomplete de lugar indisponível. Configure GOOGLE_PLACES_API_KEY.",
      mode: "supabase",
    });

    isGooglePlacesConfiguredMock.mockReturnValue(true);

    await expect(searchRecommendationPlaceSuggestionsAction("ab")).resolves.toEqual({
      ok: false,
      message: "Digite pelo menos 3 caracteres para buscar o lugar.",
      mode: "supabase",
    });
    expect(searchPlaceSuggestionsMock).not.toHaveBeenCalled();
  });

  it("returns place suggestions when Google Places responds", async () => {
    const suggestions: PlaceSuggestion[] = [
      {
        placeId: "abc123",
        placeName: "Tigela Norte",
        description: "Tigela Norte, Piracicaba - SP, Brasil",
        secondaryText: "Piracicaba - SP, Brasil",
      },
    ];
    searchPlaceSuggestionsMock.mockResolvedValue(suggestions);

    await expect(searchRecommendationPlaceSuggestionsAction("Tigela Norte")).resolves.toEqual({
      ok: true,
      data: suggestions,
      message: "Lugar encontrado.",
      mode: "supabase",
    });
    expect(searchPlaceSuggestionsMock).toHaveBeenCalledWith("Tigela Norte");
  });

  it("returns a friendly error when place search throws unexpectedly", async () => {
    searchPlaceSuggestionsMock.mockRejectedValue(new Error("boom"));

    await expect(searchRecommendationPlaceSuggestionsAction("Tigela Norte")).resolves.toEqual({
      ok: false,
      message: "Busca de lugar temporariamente indisponível. Tente novamente.",
      mode: "supabase",
    });
  });

  it("rejects invalid or unavailable place autofill selections", async () => {
    await expect(autofillRecommendationPlaceAction("ab", "x")).resolves.toEqual({
      ok: false,
      message: "Selecione um lugar válido da lista.",
      mode: "supabase",
    });
    expect(getPlaceAutofillMock).not.toHaveBeenCalled();

    await expect(autofillRecommendationPlaceAction("abc123", "Tigela Norte")).resolves.toEqual({
      ok: false,
      message: "Não consegui preencher esse lugar automaticamente. Complete os dados manualmente.",
      mode: "supabase",
    });
  });

  it("returns autofill data and message when place details are available", async () => {
    const autofill: PlaceAutofill = {
      address: "Rua do Porto, 123 - Piracicaba, SP, Brasil",
      latitude: -22.7253,
      longitude: -47.6492,
      neighborhood: "Rua do Porto",
      placeName: "Tigela Norte",
    };
    getPlaceAutofillMock.mockResolvedValue(autofill);

    await expect(autofillRecommendationPlaceAction("abc123", "Tigela Norte")).resolves.toEqual({
      ok: true,
      data: autofill,
      message: "Lugar preenchido automaticamente.",
      mode: "supabase",
    });
    expect(getPlaceAutofillMock).toHaveBeenCalledWith("abc123", "Tigela Norte");
  });

  it("allows anonymous place autofill in supabase mode", async () => {
    getCurrentUserMock.mockResolvedValue({ profile: null, mode: "supabase" });
    const autofill: PlaceAutofill = {
      address: "Rua do Porto, 123 - Piracicaba, SP, Brasil",
      latitude: -22.7253,
      longitude: -47.6492,
      neighborhood: "Centro",
      placeName: "Babbo Pizzaria",
    };
    getPlaceAutofillMock.mockResolvedValue(autofill);

    await expect(autofillRecommendationPlaceAction("abc123", "Babbo Pizzaria")).resolves.toEqual({
      ok: true,
      data: autofill,
      message: "Lugar preenchido automaticamente.",
      mode: "supabase",
    });
    expect(getPlaceAutofillMock).toHaveBeenCalledWith("abc123", "Babbo Pizzaria");
  });

  it("returns a friendly error when autofill throws unexpectedly", async () => {
    getPlaceAutofillMock.mockRejectedValue(new Error("boom"));

    await expect(autofillRecommendationPlaceAction("abc123", "Tigela Norte")).resolves.toEqual({
      ok: false,
      message: "Preenchimento automático temporariamente indisponível. Tente novamente.",
      mode: "supabase",
    });
  });
});
describe("geocodeRecommendationAddressAction", () => {
  it("blocks geocoding when not logged in", async () => {
    const { geocodeRecommendationAddressAction } = await import("./actions");
    getCurrentUserMock.mockResolvedValue({ profile: null, mode: "supabase" });
    getRecommendationRepositoryMock.mockResolvedValue({ mode: "supabase" });

    await expect(geocodeRecommendationAddressAction("Rua do Porto, 123")).resolves.toEqual({
      ok: false,
      message: "Faça login para buscar o endereço.",
      mode: "supabase",
    });
  });
});
