"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, EyeOff, ShieldAlert } from "lucide-react";
import { updateRecommendationStatusAction } from "@/app/recommendations/actions";
import type { ModerationStatus, Recommendation } from "@/domain/recommendations";
import { getReportedRecommendations } from "@/lib/recommendations";

interface ModerationQueueProps {
  recommendations: Recommendation[];
}

export function ModerationQueue({ recommendations }: ModerationQueueProps) {
  const router = useRouter();
  const reportedRecommendations = useMemo(
    () => getReportedRecommendations(recommendations),
    [recommendations],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function updateStatus(recommendationId: string, status: ModerationStatus) {
    setPendingId(recommendationId);

    try {
      const result = await updateRecommendationStatusAction(recommendationId, status);

      setMessage(result.message);
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

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
        const isPending = pendingId === recommendation.id;

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
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => updateStatus(recommendation.id, "active")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check aria-hidden="true" size={16} />
                  Manter ativo
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => updateStatus(recommendation.id, "hidden")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <EyeOff aria-hidden="true" size={16} />
                  Ocultar
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}