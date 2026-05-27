/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Recommendation } from "@/domain/recommendations";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

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

const existingRecommendation: Recommendation = {
  id: "rec-1",
  dishName: "Coxinha cremosa",
  placeName: "Bar da Esquina",
  category: "lanche",
  city: "Piracicaba",
  neighborhood: "Centro",
  address: "Rua Boa, 123",
  latitude: -22.7253,
  longitude: -47.6492,
  pricePaid: 18,
  priceBand: "ate-30",
  valueScore: 5,
  tags: ["coxinha"],
  summary: "Coxinha sequinha e bem recheada.",
  whyWorthIt: "A massa e o recheio compensam muito pelo preço pago.",
  imageUrl: "https://example.com/coxinha.jpg",
  imageAlt: "Coxinha cremosa",
  author: {
    id: "user-1",
    name: "Bia Ramos",
    handle: "@bia",
    role: "member",
  },
  status: "active",
  reportCount: 0,
  createdAt: "2026-05-24T12:00:00.000Z",
};

describe("RecommendationFormMock", () => {
  afterEach(() => {
    cleanup();
  });

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

    vi.mocked(recommendationActions.createRecommendationAction).mockResolvedValue({
      ok: true,
      data: { id: "rec-new" },
      message: "Recomendação publicada.",
      mode: "supabase",
    });

    vi.mocked(recommendationActions.updateRecommendationAction).mockResolvedValue({
      ok: true,
      data: { id: "rec-1" },
      message: "Recomendação atualizada.",
      mode: "supabase",
    });
  });

  it("navigates to the profile after publishing a recommendation", async () => {
    render(<RecommendationFormMock />);

    fillValidRecommendationForm();
    fireEvent.click(screen.getByRole("button", { name: /publicar recomendação/i }));

    await waitFor(() => {
      expect(recommendationActions.createRecommendationAction).toHaveBeenCalled();
    });
    expect(pushMock).toHaveBeenCalledWith("/profile");
  });

  it("stays on the form when publishing fails", async () => {
    vi.mocked(recommendationActions.createRecommendationAction).mockResolvedValue({
      ok: false,
      message: "Não foi possível publicar agora.",
      mode: "supabase",
    });
    render(<RecommendationFormMock />);

    fillValidRecommendationForm();
    fireEvent.click(screen.getByRole("button", { name: /publicar recomendação/i }));

    expect(await screen.findByText("Não foi possível publicar agora.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does not navigate to profile after editing a recommendation", async () => {
    const scrollToMock = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

    render(<RecommendationFormMock recommendation={existingRecommendation} />);

    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(recommendationActions.updateRecommendationAction).toHaveBeenCalledWith("rec-1", expect.any(FormData));
    });
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    scrollToMock.mockRestore();
    expect(pushMock).not.toHaveBeenCalled();
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

function fillValidRecommendationForm() {
  fireEvent.change(screen.getByLabelText("Prato"), { target: { value: "Coxinha cremosa" } });
  fireEvent.change(screen.getByPlaceholderText("Ex.: Tigela Norte"), { target: { value: "Bar da Esquina" } });
  fireEvent.change(screen.getByLabelText("Bairro"), { target: { value: "Centro" } });
  fireEvent.change(screen.getByLabelText("Quanto você pagou?"), { target: { value: "18" } });
  fireEvent.change(screen.getByLabelText("Resumo curto"), {
    target: { value: "Coxinha sequinha e bem recheada." },
  });
  fireEvent.change(screen.getByLabelText("Por que vale muito?"), {
    target: { value: "A massa e o recheio compensam muito pelo preço pago." },
  });
}
