import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, MapPin, Star } from "lucide-react";
import { OwnerRecommendationActions } from "@/components/recommendations/OwnerRecommendationActions";
import { ReportRecommendationButton } from "@/components/recommendations/ReportRecommendationButton";
import { ShareButton } from "@/components/recommendations/ShareButton";
import { categoryLabels, priceBandLabels } from "@/domain/recommendations";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isOwnRecommendation } from "@/lib/auth/permissions";
import { formatCurrency } from "@/lib/recommendations";
import { findRecommendationForPublicRead } from "@/repositories/recommendations";

interface RecommendationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecommendationDetailPage({ params }: RecommendationDetailPageProps) {
  const { id } = await params;
  const recommendation = await findRecommendationForPublicRead(id);
  const currentUser = await getCurrentUser();

  if (!recommendation) {
    notFound();
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
      <section className="space-y-5">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950">
          <ArrowLeft aria-hidden="true" size={16} />
          Voltar para descobrir
        </Link>
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="relative aspect-[16/10] bg-stone-200">
            <Image src={recommendation.imageUrl} alt={recommendation.imageAlt} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 680px" />
          </div>
          <div className="space-y-5 p-5">
            <div>
              <p className="text-sm font-semibold text-emerald-700">{categoryLabels[recommendation.category]}</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-normal text-stone-950">{recommendation.dishName}</h1>
              <p className="mt-3 flex items-center gap-2 text-stone-600">
                <MapPin aria-hidden="true" size={18} />
                {recommendation.placeName}, {recommendation.neighborhood}
              </p>
            </div>
            <p className="text-lg leading-8 text-stone-700">{recommendation.summary}</p>
            <div className="rounded-lg bg-stone-50 p-4">
              <h2 className="text-lg font-semibold text-stone-950">Por que vale muito</h2>
              <p className="mt-2 leading-7 text-stone-700">{recommendation.whyWorthIt}</p>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-stone-500">Pontuação</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-stone-950">
                <Star aria-hidden="true" size={20} fill="currentColor" className="text-amber-600" />
                {recommendation.valueScore}/5
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-stone-500">Pagou</p>
              <p className="mt-1 text-2xl font-semibold text-stone-950">{formatCurrency(recommendation.pricePaid)}</p>
            </div>
          </div>
          <dl className="mt-5 grid gap-3 border-t border-stone-100 pt-5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-stone-500">Faixa</dt><dd className="font-semibold text-stone-950">{priceBandLabels[recommendation.priceBand]}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-stone-500">Endereço</dt><dd className="text-right font-semibold text-stone-950">{recommendation.address}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-stone-500">Autor</dt><dd className="inline-flex items-center gap-1 font-semibold text-stone-950"><BadgeCheck aria-hidden="true" size={15} />{recommendation.author.handle}</dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            {recommendation.tags.map((tag) => <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">{tag}</span>)}
          </div>
        </section>
        <section className="flex flex-wrap gap-3 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <ShareButton title={`${recommendation.dishName} no Vale Muito`} />
          <ReportRecommendationButton recommendationId={recommendation.id} />
        </section>
        {isOwnRecommendation(currentUser.profile, recommendation) ? (
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <OwnerRecommendationActions recommendationId={recommendation.id} />
          </section>
        ) : null}
      </aside>
    </main>
  );
}