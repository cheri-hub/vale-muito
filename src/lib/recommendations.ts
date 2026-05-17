import type {
  PriceBand,
  Recommendation,
  RecommendationCategory,
  RecommendationFilters,
} from "@/domain/recommendations";
import { calculateDistanceInKm } from "@/lib/geolocation";

export const defaultRecommendationFilters: RecommendationFilters = {
  query: "",
  category: "all",
  neighborhood: "all",
  priceBand: "all",
  minimumValueScore: 1,
  maxDistanceKm: "all",
  userLocation: null,
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getUniqueNeighborhoods(recommendations: readonly Recommendation[]): string[] {
  return Array.from(new Set(recommendations.map((recommendation) => recommendation.neighborhood))).sort(
    (first, second) => first.localeCompare(second, "pt-BR"),
  );
}

export function getActiveRecommendations(
  recommendations: readonly Recommendation[],
): Recommendation[] {
  return recommendations.filter((recommendation) => recommendation.status !== "hidden");
}

export function getReportedRecommendations(
  recommendations: readonly Recommendation[],
): Recommendation[] {
  return recommendations
    .filter((recommendation) => recommendation.status === "reported" || recommendation.reportCount > 0)
    .toSorted((first, second) => second.reportCount - first.reportCount);
}

export function filterRecommendations(
  recommendations: readonly Recommendation[],
  filters: RecommendationFilters,
): Recommendation[] {
  const normalizedQuery = normalize(filters.query);

  return recommendations
    .filter((recommendation) => recommendation.status !== "hidden")
    .filter((recommendation) => matchesQuery(recommendation, normalizedQuery))
    .filter((recommendation) => matchesCategory(recommendation, filters.category))
    .filter((recommendation) => matchesNeighborhood(recommendation, filters.neighborhood))
    .filter((recommendation) => matchesPriceBand(recommendation, filters.priceBand))
    .filter((recommendation) => recommendation.valueScore >= filters.minimumValueScore)
    .filter((recommendation) => matchesDistance(recommendation, filters))
    .toSorted((first, second) => compareFilteredRecommendations(first, second, filters));
}

export function getRecommendationDistanceInKm(
  recommendation: Recommendation,
  filters: RecommendationFilters,
): number | null {
  if (!filters.userLocation) {
    return null;
  }

  return calculateDistanceInKm(filters.userLocation, {
    latitude: recommendation.latitude,
    longitude: recommendation.longitude,
  });
}

function compareFeaturedRecommendations(first: Recommendation, second: Recommendation): number {
  if (second.valueScore !== first.valueScore) {
    return second.valueScore - first.valueScore;
  }

  return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
}

function matchesQuery(recommendation: Recommendation, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }

  const searchable = [
    recommendation.dishName,
    recommendation.placeName,
    recommendation.city,
    recommendation.neighborhood,
    recommendation.summary,
    ...recommendation.tags,
  ]
    .map(normalize)
    .join(" ");

  return searchable.includes(normalizedQuery);
}

function matchesCategory(
  recommendation: Recommendation,
  category: "all" | RecommendationCategory,
): boolean {
  return category === "all" || recommendation.category === category;
}

function matchesNeighborhood(recommendation: Recommendation, neighborhood: "all" | string): boolean {
  return neighborhood === "all" || recommendation.neighborhood === neighborhood;
}

function matchesPriceBand(recommendation: Recommendation, priceBand: "all" | PriceBand): boolean {
  return priceBand === "all" || recommendation.priceBand === priceBand;
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function compareFilteredRecommendations(
  first: Recommendation,
  second: Recommendation,
  filters: RecommendationFilters,
): number {
  if (filters.userLocation && filters.maxDistanceKm !== "all") {
    return (getRecommendationDistanceInKm(first, filters) ?? Infinity) - (getRecommendationDistanceInKm(second, filters) ?? Infinity);
  }

  return compareFeaturedRecommendations(first, second);
}

function matchesDistance(recommendation: Recommendation, filters: RecommendationFilters): boolean {
  if (!filters.userLocation || filters.maxDistanceKm === "all") {
    return true;
  }

  return (getRecommendationDistanceInKm(recommendation, filters) ?? Infinity) <= filters.maxDistanceKm;
}