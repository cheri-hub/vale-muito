import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { SupabaseRecommendationsRepository } from "./supabase-recommendations-repository";

describe("SupabaseRecommendationsRepository.listByAuthor", () => {
  const orderMock = vi.fn();
  const eqMock = vi.fn(() => ({ order: orderMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  const supabase = { from: fromMock } as unknown as SupabaseClient<Database>;
  const repository = new SupabaseRecommendationsRepository(supabase);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters by author and orders newest first", async () => {
    orderMock.mockResolvedValue({ data: [recommendationRow()], error: null });

    const recommendations = await repository.listByAuthor("user-bia");

    expect(fromMock).toHaveBeenCalledWith("recommendations");
    expect(eqMock).toHaveBeenCalledWith("author_id", "user-bia");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({
      id: "rec-001",
      author: { id: "user-bia", handle: "@bia" },
      tags: ["bem servido"],
    });
  });

  it("throws a friendly error when the query fails", async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(repository.listByAuthor("user-bia")).rejects.toThrow("Não foi possível carregar suas publicações.");
  });
});

function recommendationRow() {
  return {
    id: "rec-001",
    author_id: "user-bia",
    dish_name: "Sanduíche de porco com picles",
    place_name: "Brasa de Esquina",
    category: "lanche",
    city: "Piracicaba",
    neighborhood: "Rua do Porto",
    address: "Avenida Beira Rio, 1540",
    location: null,
    latitude: -22.7187,
    longitude: -47.6573,
    price_paid: 34,
    price_band: "30-60",
    value_score: 5,
    summary: "Carne suculenta, pão firme e porção que segura a fome.",
    why_worth_it: "Entrega sabor de prato principal e não parece lanche de passagem.",
    status: "active",
    report_count: 0,
    created_at: "2026-05-10T14:30:00.000Z",
    updated_at: "2026-05-10T14:30:00.000Z",
    profiles: {
      id: "user-bia",
      name: "Bia Ramos",
      handle: "@bia",
      role: "member",
    },
    recommendation_photos: [],
    recommendation_tags: [
      {
        tags: {
          slug: "bem-servido",
          label: "bem servido",
        },
      },
    ],
  };
}