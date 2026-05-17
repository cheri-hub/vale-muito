import type { Recommendation, UserProfile } from "@/domain/recommendations";

export function canModerate(user: UserProfile | null): boolean {
  return user?.role === "admin";
}

export function canSubmitRecommendation(user: UserProfile | null): boolean {
  return user !== null;
}

export function isOwnRecommendation(user: UserProfile | null, recommendation: Recommendation): boolean {
  return user?.id === recommendation.author.id;
}