"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteRecommendationAction } from "@/app/recommendations/actions";

interface OwnerRecommendationActionsProps {
  recommendationId: string;
}

export function OwnerRecommendationActions({ recommendationId }: OwnerRecommendationActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/recommendations/${recommendationId}/edit`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
        >
          <Pencil aria-hidden="true" size={16} />
          Editar
        </Link>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!window.confirm("Remover esta recomendação?")) {
              return;
            }

            startTransition(async () => {
              const result = await deleteRecommendationAction(recommendationId);
              setMessage(result.message);

              if (result.ok) {
                router.push("/");
                router.refresh();
              }
            });
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 aria-hidden="true" size={16} />
          {isPending ? "Removendo..." : "Remover"}
        </button>
      </div>
      {message ? <p className="text-xs font-medium text-stone-500">{message}</p> : null}
    </div>
  );
}