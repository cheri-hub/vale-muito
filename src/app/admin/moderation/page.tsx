import { ModerationQueue } from "@/components/admin/ModerationQueue";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listRecommendationsForPublicRead } from "@/repositories/recommendations";

export default async function ModerationPage() {
  const access = await requireAdmin();
  const recommendations = access.allowed ? await listRecommendationsForPublicRead() : [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6 max-w-3xl">
        <p className="text-sm font-semibold text-emerald-700">Admin</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-normal text-stone-950">Moderação rápida</h1>
        <p className="mt-4 leading-7 text-stone-600">
          Como as recomendações aparecem imediatamente, o primeiro controle é uma fila simples de denúncias e ocultação.
        </p>
      </section>
      {access.allowed ? (
        <ModerationQueue recommendations={recommendations} />
      ) : (
        <section className="rounded-lg border border-stone-200 bg-white p-5 text-stone-700 shadow-sm">
          Faça login com uma conta admin para revisar denúncias.
        </section>
      )}
    </main>
  );
}