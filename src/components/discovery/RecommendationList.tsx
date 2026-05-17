import type { Recommendation } from "@/domain/recommendations";
import { RecommendationCard } from "./RecommendationCard";

interface RecommendationListProps {
  recommendations: Recommendation[];
}

export function RecommendationList({ recommendations }: RecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-stone-950">Nada apareceu com esses filtros</h2>
        <p className="mt-2 text-sm text-stone-600">
          Tente abrir o preço, diminuir a nota mínima ou recomendar o primeiro achado dessa região.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {recommendations.map((recommendation) => (
        <RecommendationCard key={recommendation.id} recommendation={recommendation} />
      ))}
    </div>
  );
}