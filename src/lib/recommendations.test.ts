import { describe, expect, it } from "vitest";
import { seedRecommendations } from "@/data/seed";
import {
  defaultRecommendationFilters,
  filterRecommendations,
  formatCurrency,
  getReportedRecommendations,
  getUniqueNeighborhoods,
} from "./recommendations";

describe("recommendation helpers", () => {
  it("filters recommendations by accent-insensitive text search", () => {
    const results = filterRecommendations(seedRecommendations, {
      ...defaultRecommendationFilters,
      query: "lamen",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.dishName).toBe("Lamen de missô picante");
  });

  it("combines category, neighborhood and minimum score filters", () => {
    const results = filterRecommendations(seedRecommendations, {
      ...defaultRecommendationFilters,
      category: "lanche",
      neighborhood: "Rua do Porto",
      minimumValueScore: 5,
    });

    expect(results.map((recommendation) => recommendation.id)).toEqual(["rec-001"]);
  });

  it("filters by distance when user location and radius are available", () => {
    const results = filterRecommendations(seedRecommendations, {
      ...defaultRecommendationFilters,
      userLocation: { latitude: -22.7187, longitude: -47.6573 },
      maxDistanceKm: 2,
    });

    expect(results.map((recommendation) => recommendation.id)).toEqual(["rec-001", "rec-003"]);
  });

  it("keeps distance filter inactive until a user location exists", () => {
    const results = filterRecommendations(seedRecommendations, {
      ...defaultRecommendationFilters,
      maxDistanceKm: 2,
    });

    expect(results.length).toBeGreaterThan(2);
  });

  it("keeps reported recommendations visible and excludes hidden ones", () => {
    const visibleReportedRecommendation = {
      ...seedRecommendations[0],
      id: "reported-visible",
      status: "reported" as const,
      reportCount: 3,
    };
    const hiddenRecommendation = {
      ...seedRecommendations[1],
      id: "hidden-admin-approved",
      status: "hidden" as const,
      reportCount: 3,
    };

    const results = filterRecommendations([visibleReportedRecommendation, hiddenRecommendation], defaultRecommendationFilters);

    expect(results.map((recommendation) => recommendation.id)).toEqual(["reported-visible"]);
  });

  it("sorts reported recommendations by report count", () => {
    const results = getReportedRecommendations(seedRecommendations);

    expect(results[0]?.id).toBe("rec-005");
    expect(results.some((recommendation) => recommendation.id === "rec-003")).toBe(false);
    expect(results.every((recommendation) => recommendation.status === "reported")).toBe(true);
  });

  it("returns sorted unique neighborhoods", () => {
    expect(getUniqueNeighborhoods(seedRecommendations)).toEqual([
      "Alto",
      "Centro",
      "Dois Córregos",
      "Rua do Porto",
      "Santa Terezinha",
    ]);
  });

  it("formats Brazilian currency without cents", () => {
    expect(formatCurrency(34)).toBe("R$ 34");
  });
});