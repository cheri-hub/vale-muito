"use client";

import { useMemo, useState } from "react";
import { EyeOff, RotateCcw, ShieldAlert } from "lucide-react";
import { updateRecommendationStatusAction } from "@/app/recommendations/actions";
import type { Recommendation } from "@/domain/recommendations";
import { getReportedRecommendations } from "@/lib/recommendations";

interface ModerationQueueProps {
  recommendations: Recommendation[];
}

export function ModerationQueue({ recommendations }: ModerationQueueProps) {
  const reportedRecommendations = useMemo(
    () => getReportedRecommendations(recommendations),
    [recommendations],
  );
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  if (reportedRecommendations.length === 0) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-5 text-stone-700 shadow-sm">
        Nenhuma recomendação denunciada no momento.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-900">{message}</p> : null}
      {reportedRecommendations.map((recommendation) => {
        const isHidden = hiddenIds.has(recommendation.id);

        return (
          <article key={recommendation.id} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                  <ShieldAlert aria-hidden="true" size={14} />
                  {recommendation.reportCount} denúncia{recommendation.reportCount > 1 ? "s" : ""}
                </p>
                <div>
                  <h2 className="text-xl font-semibold text-stone-950">{recommendation.dishName}</h2>
                  <p className="text-sm text-stone-600">
                    {recommendation.placeName} em {recommendation.neighborhood} por {recommendation.author.handle}
                  </p>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-stone-700">{recommendation.whyWorthIt}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const nextStatus = isHidden ? "reported" : "hidden";
                  const result = await updateRecommendationStatusAction(recommendation.id, nextStatus);

                  setMessage(result.message);
                  setHiddenIds((current) => {
                    const next = new Set(current);

                    if (next.has(recommendation.id)) {
                      next.delete(recommendation.id);
                    } else {
                      next.add(recommendation.id);
                    }

                    return next;
                  });
                }}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                {isHidden ? <RotateCcw aria-hidden="true" size={16} /> : <EyeOff aria-hidden="true" size={16} />}
                {isHidden ? "Restaurar" : "Ocultar"}
              </button>
            </div>
            {isHidden ? (
              <p className="mt-4 rounded-md bg-stone-100 p-3 text-sm font-medium text-stone-700">
                Oculto nesta sessão. Com Supabase configurado, a ação também é persistida.
              </p>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}