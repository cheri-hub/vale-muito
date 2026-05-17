import { Camera, MapPin, ReceiptText } from "lucide-react";
import { appEditorialRule, appOfficialRegion, isRecommendationPhotoRequired } from "@/lib/product";

const guidelines = [
  {
    icon: ReceiptText,
    title: "Regra editorial",
    text: appEditorialRule,
  },
  {
    icon: MapPin,
    title: "Região inicial",
    text: `O beta começa por ${appOfficialRegion.label}. Recomendações fora da região podem entrar depois, quando a comunidade crescer.`,
  },
  {
    icon: Camera,
    title: "Foto",
    text: isRecommendationPhotoRequired
      ? "A publicação precisa ter foto do prato."
      : "Foto não é obrigatória. O contexto do gasto, porção e sabor é o que decide se vale muito.",
  },
];

export default function GuidelinesPage() {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold text-emerald-700">Critérios públicos</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-normal text-stone-950">O que entra no Vale Muito</h1>
        <p className="mt-4 leading-7 text-stone-600">
          A recomendação precisa ajudar outra pessoa a decidir se vale gastar dinheiro naquele prato.
        </p>
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        {guidelines.map((guideline) => {
          const Icon = guideline.icon;

          return (
            <article key={guideline.title} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                <Icon aria-hidden="true" size={17} className="text-emerald-700" />
                {guideline.title}
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-600">{guideline.text}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}