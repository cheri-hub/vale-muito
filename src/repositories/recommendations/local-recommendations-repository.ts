import { seedRecommendations } from "@/data/seed";
import type { ModerationStatus, Recommendation } from "@/domain/recommendations";
import { getNextModerationStatus } from "@/lib/moderation";
import { calculatePriceBand } from "@/lib/pricing";
import type { CreateRecommendationInput, RecommendationRepository, UpdateRecommendationInput } from "./recommendations-repository";

export class LocalRecommendationsRepository implements RecommendationRepository {
  private recommendations: Recommendation[];

  constructor(recommendations: readonly Recommendation[] = seedRecommendations) {
    this.recommendations = recommendations.map((recommendation) => ({ ...recommendation }));
  }

  async list(): Promise<Recommendation[]> {
    return this.recommendations.map((recommendation) => ({ ...recommendation }));
  }

  async listByAuthor(authorId: string): Promise<Recommendation[]> {
    return this.recommendations
      .filter((recommendation) => recommendation.author.id === authorId)
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
      .map((recommendation) => ({ ...recommendation }));
  }

  async findById(id: string): Promise<Recommendation | null> {
    const recommendation = this.recommendations.find((item) => item.id === id);
    return recommendation ? { ...recommendation } : null;
  }

  async create(input: CreateRecommendationInput, authorId: string): Promise<Recommendation> {
    const recommendation: Recommendation = {
      id: `offline-${Date.now()}`,
      dishName: input.dishName,
      placeName: input.placeName,
      category: input.category,
      city: input.city,
      neighborhood: input.neighborhood,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      pricePaid: input.pricePaid,
      priceBand: calculatePriceBand(input.pricePaid),
      valueScore: input.valueScore as Recommendation["valueScore"],
      tags: input.tags,
      summary: input.summary,
      whyWorthIt: input.whyWorthIt,
      imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
      imageAlt: input.photo?.altText ?? `Foto ilustrativa de ${input.dishName}`,
      author: {
        id: authorId,
        name: "Usuário Demo",
        handle: "@demo",
        role: "member",
      },
      status: "active",
      reportCount: 0,
      createdAt: new Date().toISOString(),
    };

    this.recommendations = [recommendation, ...this.recommendations];
    return { ...recommendation };
  }

  async report(id: string, reporterId: string | null, reason: string): Promise<Recommendation | null> {
    void reporterId;
    void reason;
    const recommendation = await this.findById(id);

    if (!recommendation) {
      return null;
    }

    const reportCount = recommendation.reportCount + 1;
    const updatedRecommendation: Recommendation = {
      ...recommendation,
      reportCount,
      status: getNextModerationStatus(recommendation.status, reportCount),
    };

    this.recommendations = this.recommendations.map((item) => (item.id === id ? updatedRecommendation : item));

    return updatedRecommendation;
  }

  async update(id: string, input: UpdateRecommendationInput, authorId: string): Promise<Recommendation | null> {
    const recommendation = await this.findById(id);

    if (!recommendation || recommendation.author.id !== authorId) {
      return null;
    }

    const updatedRecommendation: Recommendation = {
      ...recommendation,
      dishName: input.dishName,
      placeName: input.placeName,
      category: input.category,
      city: input.city,
      neighborhood: input.neighborhood,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      pricePaid: input.pricePaid,
      priceBand: calculatePriceBand(input.pricePaid),
      valueScore: input.valueScore as Recommendation["valueScore"],
      tags: input.tags,
      summary: input.summary,
      whyWorthIt: input.whyWorthIt,
      imageAlt: input.photo?.altText ?? recommendation.imageAlt,
    };

    this.recommendations = this.recommendations.map((item) => (item.id === id ? updatedRecommendation : item));

    return { ...updatedRecommendation };
  }

  async delete(id: string, authorId: string): Promise<boolean> {
    const recommendation = await this.findById(id);

    if (!recommendation || recommendation.author.id !== authorId) {
      return false;
    }

    this.recommendations = this.recommendations.filter((item) => item.id !== id);

    return true;
  }

  async updateStatus(id: string, status: ModerationStatus, adminId: string | null): Promise<Recommendation | null> {
    void adminId;
    const recommendation = await this.findById(id);

    if (!recommendation) {
      return null;
    }

    const updatedRecommendation: Recommendation = { ...recommendation, status };
    this.recommendations = this.recommendations.map((item) => (item.id === id ? updatedRecommendation : item));

    return updatedRecommendation;
  }
}