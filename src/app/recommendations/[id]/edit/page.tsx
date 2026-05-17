import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RecommendationFormMock } from "@/components/forms/RecommendationFormMock";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isOwnRecommendation } from "@/lib/auth/permissions";
import { getRecommendationRepository } from "@/repositories/recommendations";

interface EditRecommendationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRecommendationPage({ params }: EditRecommendationPageProps) {
  const { id } = await params;
  const repository = await getRecommendationRepository();
  const recommendation = await repository.data.findById(id);

  if (!recommendation) {
    notFound();
  }

  const currentUser = await getCurrentUser();

  if (!isOwnRecommendation(currentUser.profile, recommendation)) {
    redirect(`/recommendations/${id}`);
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/recommendations/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950">
        <ArrowLeft aria-hidden="true" size={16} />
        Voltar para a recomendação
      </Link>
      <section>
        <p className="text-sm font-semibold text-emerald-700">Editar recomendação</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-normal text-stone-950">Atualize o que ainda vale muito.</h1>
      </section>
      <RecommendationFormMock recommendation={recommendation} />
    </main>
  );
}