import type { Recommendation } from "@/domain/recommendations";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LocalRecommendationsRepository } from "./local-recommendations-repository";
import type { RecommendationRepository, RepositoryResult } from "./recommendations-repository";
import { SupabaseRecommendationsRepository } from "./supabase-recommendations-repository";

export async function getRecommendationRepository(): Promise<RepositoryResult<RecommendationRepository>> {
  if (!isSupabaseConfigured()) {
    return { data: new LocalRecommendationsRepository(), mode: "offline" };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { data: new LocalRecommendationsRepository(), mode: "offline" };
  }

  return { data: new SupabaseRecommendationsRepository(supabase), mode: "supabase" };
}

export async function listRecommendationsForPublicRead(): Promise<Recommendation[]> {
  const repository = await getRecommendationRepository();

  try {
    return await repository.data.list();
  } catch {
    return new LocalRecommendationsRepository().list();
  }
}

export async function findRecommendationForPublicRead(id: string): Promise<Recommendation | null> {
  const repository = await getRecommendationRepository();

  try {
    return await repository.data.findById(id);
  } catch {
    return new LocalRecommendationsRepository().findById(id);
  }
}