import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { RecommendationCard } from "@/components/discovery/RecommendationCard";
import { OwnerRecommendationActions } from "@/components/recommendations/OwnerRecommendationActions";
import type { Recommendation } from "@/domain/recommendations";

interface ProfileRecommendationListProps {
  recommendations: Recommendation[];
}

const statusLabels: Record<Recommendation["status"], string> = {
  active: "Publicada",
  reported: "Em revisão",
  hidden: "Oculta",
};

export function ProfileRecommendationList({ recommendations }: ProfileRecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center">
        <h2 className="text-xl font-semibold tracking-normal text-stone-950">Você ainda não publicou recomendações.</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
          Quando você recomendar uma comida que vale muito, ela aparece aqui para editar ou remover depois.
        </p>
        <Link
          href="/recommend/new"
          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          <PlusCircle aria-hidden="true" size={16} />
          Criar recomendação
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Minhas publicações</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-stone-950">
            {recommendations.length} {recommendations.length === 1 ? "publicação" : "publicações"}
          </h2>
        </div>
        <Link
          href="/recommend/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          <PlusCircle aria-hidden="true" size={16} />
          Nova recomendação
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {recommendations.map((recommendation) => (
          <div key={recommendation.id} className="space-y-3">
            <div className="flex justify-end">
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                {statusLabels[recommendation.status]}
              </span>
            </div>
            <RecommendationCard recommendation={recommendation} />
            <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <OwnerRecommendationActions recommendationId={recommendation.id} redirectTo="/profile" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}