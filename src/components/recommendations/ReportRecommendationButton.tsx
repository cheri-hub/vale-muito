"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { reportRecommendationAction } from "@/app/recommendations/actions";

interface ReportRecommendationButtonProps {
  recommendationId: string;
}

export function ReportRecommendationButton({ recommendationId }: ReportRecommendationButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = await reportRecommendationAction(recommendationId, "Conteúdo incorreto ou inadequado");
            setMessage(result.message);
          });
        }}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Flag aria-hidden="true" size={16} />
        {isPending ? "Enviando..." : "Denunciar"}
      </button>
      {message ? <p className="text-xs font-medium text-stone-500">{message}</p> : null}
    </div>
  );
}