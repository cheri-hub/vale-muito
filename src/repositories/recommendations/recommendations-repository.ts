import type { ModerationStatus, Recommendation, RecommendationInput } from "@/domain/recommendations";

export type RepositoryMode = "offline" | "supabase";

export interface CreateRecommendationInput extends RecommendationInput {
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  tags: string[];
  photo?: CreateRecommendationPhotoInput;
}

export interface UpdateRecommendationInput extends CreateRecommendationInput {
  removePhoto?: boolean;
}

export interface CreateRecommendationPhotoInput {
  file: File;
  altText: string;
}

export interface ActionResult<T = null> {
  ok: boolean;
  data?: T;
  message: string;
  mode: RepositoryMode;
}

export interface RepositoryResult<T> {
  data: T;
  mode: RepositoryMode;
}

export interface RecommendationRepository {
  list(): Promise<Recommendation[]>;
  listByAuthor(authorId: string): Promise<Recommendation[]>;
  findById(id: string): Promise<Recommendation | null>;
  create(input: CreateRecommendationInput, authorId: string): Promise<Recommendation>;
  update(id: string, input: UpdateRecommendationInput, authorId: string): Promise<Recommendation | null>;
  delete(id: string, authorId: string): Promise<boolean>;
  report(id: string, reporterId: string | null, reason: string): Promise<Recommendation | null>;
  updateStatus(id: string, status: ModerationStatus, adminId: string | null): Promise<Recommendation | null>;
}