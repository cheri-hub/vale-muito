import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MapPin, MessageSquareWarning, Star } from "lucide-react";
import {
  categoryLabels,
  priceBandLabels,
  type Recommendation,
} from "@/domain/recommendations";
import { formatCurrency } from "@/lib/recommendations";

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <article className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[16/10] bg-stone-200">
        <Image
          src={recommendation.imageUrl}
          alt={recommendation.imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 420px"
        />
        <div className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm dark:bg-stone-950/85 dark:text-emerald-300">
          Vale {recommendation.valueScore}/5
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-emerald-700">{categoryLabels[recommendation.category]}</p>
              <h2 className="text-xl font-semibold tracking-normal text-stone-950">
                <Link href={`/recommendations/${recommendation.id}`} className="hover:text-emerald-800">
                  {recommendation.dishName}
                </Link>
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-sm font-semibold text-amber-900">
              <Star aria-hidden="true" size={15} fill="currentColor" />
              {recommendation.valueScore}
            </div>
          </div>
          <p className="flex items-center gap-2 text-sm font-medium text-stone-600">
            <MapPin aria-hidden="true" size={16} />
            {recommendation.placeName}, {recommendation.neighborhood}
          </p>
        </div>

        <p className="text-sm leading-6 text-stone-700">{recommendation.summary}</p>

        <Link
          href={`/recommendations/${recommendation.id}`}
          className="inline-flex text-sm font-semibold text-emerald-800 hover:text-emerald-950"
        >
          Ver por que vale muito
        </Link>

        <div className="flex flex-wrap gap-2">
          {recommendation.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
              {tag}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-4 text-sm">
          <div>
            <p className="text-stone-500">Pagou</p>
            <p className="font-semibold text-stone-950">{formatCurrency(recommendation.pricePaid)}</p>
          </div>
          <div>
            <p className="text-stone-500">Faixa</p>
            <p className="font-semibold text-stone-950">{priceBandLabels[recommendation.priceBand]}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-stone-100 pt-4 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck aria-hidden="true" size={15} />
            {recommendation.author.handle}
          </span>
          {recommendation.reportCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <MessageSquareWarning aria-hidden="true" size={15} />
              {recommendation.reportCount} denúncia{recommendation.reportCount > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}