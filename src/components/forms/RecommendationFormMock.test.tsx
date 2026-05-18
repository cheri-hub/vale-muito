/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () => function MockRecommendationLocationPicker() {
    return <div data-testid="recommendation-location-picker" />;
  },
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt?: string }) => <div aria-label={alt} data-testid="mock-next-image" />,
}));

vi.mock("@/app/recommendations/actions", () => ({
  autofillRecommendationPlaceAction: vi.fn(),
  createRecommendationAction: vi.fn(),
  geocodeRecommendationAddressAction: vi.fn(),
  searchRecommendationPlaceSuggestionsAction: vi.fn(),
  updateRecommendationAction: vi.fn(),
}));

import * as recommendationActions from "@/app/recommendations/actions";
import { RecommendationFormMock } from "./RecommendationFormMock";

describe("RecommendationFormMock", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(recommendationActions.searchRecommendationPlaceSuggestionsAction).mockResolvedValue({
      ok: true,
      data: [
        {
          placeId: "place-123",
          placeName: "Tigela Norte",
          description: "Tigela Norte, Piracicaba - SP, Brasil",
          secondaryText: "Piracicaba - SP, Brasil",
        },
      ],
      message: "Lugar encontrado.",
      mode: "supabase",
    });

    vi.mocked(recommendationActions.autofillRecommendationPlaceAction).mockResolvedValue({
      ok: true,
      data: {
        address: "Rua do Porto, 123 - Piracicaba, SP, Brasil",
        latitude: -22.7253,
        longitude: -47.6492,
        neighborhood: "Centro",
        placeName: "Tigela Norte - Confirmado",
      },
      message: "Lugar preenchido automaticamente.",
      mode: "supabase",
    });
  });

  it("autofills place details without overwriting the dish field", async () => {
    render(<RecommendationFormMock placeAutocompleteEnabled />);

    const dishInput = screen.getByLabelText("Prato");
    const placeInput = screen.getByPlaceholderText("Ex.: Tigela Norte");

    expect(dishInput).toHaveValue("");
    expect(screen.getByLabelText("Endereço")).toHaveValue("");
    expect(screen.getByLabelText("Bairro")).toHaveValue("");

    fireEvent.change(dishInput, { target: { value: "Coxinha de frango" } });
    expect(dishInput).toHaveValue("Coxinha de frango");

    fireEvent.focus(placeInput);
    fireEvent.change(placeInput, { target: { value: "Tigela Norte" } });

    await waitFor(() => {
      expect(recommendationActions.searchRecommendationPlaceSuggestionsAction).toHaveBeenCalledWith("Tigela Norte");
    });

    const suggestionsList = await screen.findByRole("listbox");
    fireEvent.click(within(suggestionsList).getByRole("option", { name: /Tigela Norte/i }));

    await waitFor(() => {
      expect(recommendationActions.autofillRecommendationPlaceAction).toHaveBeenCalledWith("place-123", "Tigela Norte");
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ex.: Tigela Norte")).toHaveValue("Tigela Norte - Confirmado");
    });

    expect(screen.getByLabelText("Prato")).toHaveValue("Coxinha de frango");
    expect(screen.getByPlaceholderText("Ex.: Tigela Norte")).toHaveValue("Tigela Norte - Confirmado");
    expect(screen.getByLabelText("Endereço")).toHaveValue("Rua do Porto, 123 - Piracicaba, SP, Brasil");
    expect(screen.getByLabelText("Bairro")).toHaveValue("Centro");
    expect(screen.getByLabelText("Latitude")).toHaveValue(-22.7253);
    expect(screen.getByLabelText("Longitude")).toHaveValue(-47.6492);
  });
});
