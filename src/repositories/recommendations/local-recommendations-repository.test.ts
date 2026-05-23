import { describe, expect, it } from "vitest";
import { LocalRecommendationsRepository } from "./local-recommendations-repository";

describe("LocalRecommendationsRepository", () => {
  it("finds a seeded recommendation by id", async () => {
    const repository = new LocalRecommendationsRepository();

    await expect(repository.findById("rec-001")).resolves.toMatchObject({
      id: "rec-001",
      dishName: "Sanduíche de porco com picles",
    });
  });

  it("returns null for unknown ids", async () => {
    const repository = new LocalRecommendationsRepository();

    await expect(repository.findById("missing")).resolves.toBeNull();
  });

  it("creates an offline recommendation with calculated price band", async () => {
    const repository = new LocalRecommendationsRepository([]);

    const recommendation = await repository.create(
      {
        dishName: "Pastel de queijo",
        placeName: "Feira da Praça",
        category: "lanche",
        city: "Piracicaba",
        neighborhood: "Centro",
        address: "Praça Central, 1",
        latitude: -22.7253,
        longitude: -47.6492,
        pricePaid: 12,
        valueScore: 5,
        summary: "Pastel seco e muito recheado.",
        whyWorthIt: "A massa vem crocante, o recheio é generoso e o preço continua honesto.",
        tags: ["barato"],
      },
      "user-1",
    );

    expect(recommendation.priceBand).toBe("ate-30");
    await expect(repository.list()).resolves.toHaveLength(1);
  });

  it("lists only recommendations owned by an author", async () => {
    const repository = new LocalRecommendationsRepository();

    const recommendations = await repository.listByAuthor("user-bia");

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.every((recommendation) => recommendation.author.id === "user-bia")).toBe(true);
  });

  it("returns an empty list when an author has no recommendations", async () => {
    const repository = new LocalRecommendationsRepository();

    await expect(repository.listByAuthor("missing-user")).resolves.toEqual([]);
  });

  it("reports and auto-hides after enough reports", async () => {
    const repository = new LocalRecommendationsRepository();

    await repository.report("rec-001", "user-2", "spam");
    await repository.report("rec-001", "user-3", "spam");
    const recommendation = await repository.report("rec-001", "user-4", "spam");

    expect(recommendation?.status).toBe("hidden");
  });

  it("updates only recommendations owned by the author", async () => {
    const repository = new LocalRecommendationsRepository();

    await expect(
      repository.update(
        "rec-001",
        {
          dishName: "Sanduíche ainda melhor",
          placeName: "Brasa de Esquina",
          category: "lanche",
          city: "Piracicaba",
          neighborhood: "Rua do Porto",
          address: "Avenida Beira Rio, 1540",
          latitude: -22.7187,
          longitude: -47.6573,
          pricePaid: 39,
          valueScore: 5,
          summary: "Continuou valendo muito pelo tamanho e sabor.",
          whyWorthIt: "A porção segue generosa, o sabor continua acima da média e o preço ainda fecha a conta.",
          tags: ["bem servido"],
        },
        "user-bia",
      ),
    ).resolves.toMatchObject({ dishName: "Sanduíche ainda melhor", pricePaid: 39 });

    await expect(
      repository.update(
        "rec-001",
        {
          dishName: "Tentativa sem dono",
          placeName: "Brasa de Esquina",
          category: "lanche",
          city: "Piracicaba",
          neighborhood: "Rua do Porto",
          address: "Avenida Beira Rio, 1540",
          latitude: -22.7187,
          longitude: -47.6573,
          pricePaid: 39,
          valueScore: 5,
          summary: "Continuou valendo muito pelo tamanho e sabor.",
          whyWorthIt: "A porção segue generosa, o sabor continua acima da média e o preço ainda fecha a conta.",
          tags: ["bem servido"],
        },
        "user-teo",
      ),
    ).resolves.toBeNull();
  });

  it("deletes only recommendations owned by the author", async () => {
    const repository = new LocalRecommendationsRepository();

    await expect(repository.delete("rec-001", "user-teo")).resolves.toBe(false);
    await expect(repository.findById("rec-001")).resolves.not.toBeNull();

    await expect(repository.delete("rec-001", "user-bia")).resolves.toBe(true);
    await expect(repository.findById("rec-001")).resolves.toBeNull();
  });
});