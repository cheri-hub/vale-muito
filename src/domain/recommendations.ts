import { z } from "zod";

export type RecommendationCategory =
  | "almoco"
  | "cafe"
  | "delivery"
  | "jantar"
  | "lanche"
  | "sobremesa";

export type PriceBand = "ate-30" | "30-60" | "60-100" | "100-plus";

export type ModerationStatus = "active" | "reported" | "hidden";

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  role: "admin" | "member";
}

export interface Recommendation {
  id: string;
  dishName: string;
  placeName: string;
  category: RecommendationCategory;
  city: string;
  neighborhood: string;
  address: string;
  latitude: number;
  longitude: number;
  pricePaid: number;
  priceBand: PriceBand;
  valueScore: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  summary: string;
  whyWorthIt: string;
  imageUrl: string;
  imageAlt: string;
  author: UserProfile;
  status: ModerationStatus;
  reportCount: number;
  createdAt: string;
}

export interface RecommendationFilters {
  query: string;
  category: "all" | RecommendationCategory;
  neighborhood: "all" | string;
  priceBand: "all" | PriceBand;
  minimumValueScore: number;
  maxDistanceKm: "all" | number;
  userLocation: { latitude: number; longitude: number } | null;
}

export interface RecommendationInput {
  dishName: string;
  placeName: string;
  category: RecommendationCategory;
  neighborhood: string;
  pricePaid: number;
  valueScore: number;
  summary: string;
  whyWorthIt: string;
}

export const recommendationInputSchema = z.object({
  dishName: z.string().trim().min(3, "Nome do prato precisa ter pelo menos 3 caracteres.").max(100),
  placeName: z.string().trim().min(3, "Nome do lugar precisa ter pelo menos 3 caracteres.").max(100),
  category: z.enum(["almoco", "cafe", "delivery", "jantar", "lanche", "sobremesa"]),
  neighborhood: z.string().trim().min(2, "Informe o bairro.").max(80),
  pricePaid: z.coerce.number().positive("Informe quanto voce pagou."),
  valueScore: z.coerce.number().int().min(1).max(5),
  summary: z.string().trim().min(12, "Resumo precisa explicar o valor.").max(280),
  whyWorthIt: z.string().trim().min(24, "Conte por que vale muito.").max(1200),
});

export const categoryLabels: Record<RecommendationCategory, string> = {
  almoco: "Almoço",
  cafe: "Café",
  delivery: "Delivery",
  jantar: "Jantar",
  lanche: "Lanche",
  sobremesa: "Sobremesa",
};

export const priceBandLabels: Record<PriceBand, string> = {
  "ate-30": "Até R$30",
  "30-60": "R$30 a R$60",
  "60-100": "R$60 a R$100",
  "100-plus": "R$100+",
};