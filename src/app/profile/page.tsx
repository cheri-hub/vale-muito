import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileRecommendationList } from "@/components/profile/ProfileRecommendationList";
import type { Recommendation } from "@/domain/recommendations";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getRecommendationRepository } from "@/repositories/recommendations";

export const metadata: Metadata = {
  title: "Perfil | Vale Muito",
  description: "Gerencie seu perfil e veja todas as suas recomendações de comida que vale muito.",
};

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser.profile) {
    redirect("/login");
  }

  const repository = await getRecommendationRepository();
  let recommendations: Recommendation[] = [];
  let loadMessage: string | null = null;

  try {
    recommendations = await repository.data.listByAuthor(currentUser.profile.id);
  } catch (error: unknown) {
    console.error("[ProfilePage] Failed to load recommendations", error);
    loadMessage = "Não foi possível carregar suas publicações agora.";
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <ProfileForm profile={currentUser.profile} />
      {loadMessage ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {loadMessage}
        </section>
      ) : null}
      <ProfileRecommendationList recommendations={recommendations} />
    </main>
  );
}